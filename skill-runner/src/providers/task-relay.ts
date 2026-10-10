import { requireImageConfig, type SkillRunnerConfig } from '../config.js';
import { saveImageBuffer } from '../render/files.js';
import { ProviderError } from './errors.js';
import type { GeneratedImage, GenerateImageInput, ImageProvider } from './types.js';

export type FetchLike = typeof fetch;

interface TaskSubmitResponse {
  task_id?: string;
  id?: string;
  status?: string;
}

interface TaskStatusResponse {
  task_id?: string;
  id?: string;
  status?: string;
  progress?: number;
  error?: unknown;
  billing?: unknown;
}

interface TaskContentResponse {
  data?: Array<{ url?: string; b64_json?: string }>;
}

export interface TaskRelayDeps {
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const SUCCESS = new Set(['succeeded', 'success', 'completed', 'done', 'finished']);
const FAILED = new Set(['failed', 'error', 'canceled', 'cancelled']);

const ASPECT_TO_SIZE: Record<string, string> = {
  '1:1': '1024x1024',
  '3:4': '1024x1365',
  '4:3': '1365x1024',
  '9:16': '1024x1820',
  '16:9': '1820x1024',
  '2.35:1': '1820x774',
};

/**
 * 中转站图像 provider（异步任务式）：
 *   POST {base}/images/tasks              → { task_id, status:"queued" }
 *   GET  {base}/images/tasks/{id}         → status: processing → succeeded
 *   GET  {base}/images/tasks/{id}/content → { data:[{url}] }
 * 下载签名 URL 落盘。失败显式抛错，绝不 mock 兜底。
 */
export class TaskRelayProvider implements ImageProvider {
  readonly name = 'task-relay';
  private readonly fetchImpl: FetchLike;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(
    private readonly config: SkillRunnerConfig,
    deps: TaskRelayDeps = {},
  ) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = deps.now ?? (() => Date.now());
  }

  private resolveSize(input: GenerateImageInput): string {
    if (input.size) return input.size;
    if (input.aspectRatio && ASPECT_TO_SIZE[input.aspectRatio]) return ASPECT_TO_SIZE[input.aspectRatio]!;
    return '1024x1024';
  }

  private headers(): Record<string, string> {
    const image = requireImageConfig(this.config);
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${image.apiKey}`,
    };
  }

  async generate(input: GenerateImageInput, outputDir: string): Promise<GeneratedImage> {
    const image = requireImageConfig(this.config);
    const model = input.model ?? image.model;
    const taskId = await this.submit(input, model);
    const status = await this.poll(taskId);
    const url = await this.fetchContentUrl(taskId);
    const { bytes, contentType } = await this.download(url);
    const saved = await saveImageBuffer(bytes, outputDir, input.filenameHint);
    return {
      localPath: saved.path,
      width: saved.width,
      height: saved.height,
      url,
      billing: status.billing,
      provider: this.name,
      model,
    };
  }

  private async submit(input: GenerateImageInput, model: string): Promise<string> {
    const url = `${this.config.image.baseUrl}/images/tasks`;
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ model, prompt: input.prompt, size: this.resolveSize(input) }),
      });
    } catch (err) {
      throw new ProviderError('submit_failed', `Failed to submit task: ${(err as Error).message}`);
    }
    if (!res.ok) {
      const body = await safeText(res);
      throw new ProviderError('submit_failed', `Submit returned ${res.status}: ${body}`);
    }
    const data = (await res.json()) as TaskSubmitResponse;
    const taskId = data.task_id ?? data.id;
    if (!taskId) {
      throw new ProviderError('submit_failed', 'Submit response missing task_id', data);
    }
    return taskId;
  }

  private async poll(taskId: string): Promise<TaskStatusResponse> {
    const start = this.now();
    const timeout = this.config.image.pollTimeoutMs;
    for (;;) {
      const res = await this.fetchImpl(`${this.config.image.baseUrl}/images/tasks/${taskId}`, {
        method: 'GET',
        headers: this.headers(),
      });
      if (!res.ok) {
        const body = await safeText(res);
        throw new ProviderError('task_failed', `Status returned ${res.status}: ${body}`);
      }
      const data = (await res.json()) as TaskStatusResponse;
      const status = String(data.status ?? '').toLowerCase();
      if (SUCCESS.has(status)) return data;
      if (FAILED.has(status)) {
        throw new ProviderError('task_failed', `Task ${taskId} ${status}`, data);
      }
      if (this.now() - start >= timeout) {
        throw new ProviderError('poll_timeout', `Task ${taskId} timed out after ${timeout}ms`);
      }
      await this.sleep(this.config.image.pollIntervalMs);
    }
  }

  private async fetchContentUrl(taskId: string): Promise<string> {
    const res = await this.fetchImpl(`${this.config.image.baseUrl}/images/tasks/${taskId}/content`, {
      method: 'GET',
      headers: this.headers(),
    });
    if (!res.ok) {
      const body = await safeText(res);
      throw new ProviderError('content_empty', `Content returned ${res.status}: ${body}`);
    }
    const data = (await res.json()) as TaskContentResponse;
    const url = data.data?.find((item) => item.url)?.url;
    if (!url) {
      throw new ProviderError('content_empty', 'Content response has no image url', data);
    }
    return url;
  }

  private async download(url: string): Promise<{ bytes: Buffer; contentType: string | null }> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, { method: 'GET' });
    } catch (err) {
      throw new ProviderError('download_failed', `Failed to download image: ${(err as Error).message}`);
    }
    if (!res.ok) {
      throw new ProviderError('download_failed', `Download returned ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    if (bytes.length === 0) {
      throw new ProviderError('download_failed', 'Downloaded image is empty');
    }
    return { bytes, contentType: res.headers.get('content-type') };
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return '<no body>';
  }
}
