import type { ImageHealth, RenderRequest, RenderResponse } from './types';

export const DEFAULT_SKILL_RUNNER_BASE_URL = 'http://127.0.0.1:5090';

export function getSkillRunnerBaseUrl(): string {
  return (process.env.SKILL_RUNNER_BASE_URL ?? DEFAULT_SKILL_RUNNER_BASE_URL).replace(/\/+$/, '');
}

async function postJson<T>(path: string, body: unknown, timeoutMs = 300000): Promise<T> {
  const base = getSkillRunnerBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`skill-runner request failed for ${path}: ${reason}`);
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`skill-runner returned ${res.status} for ${path}: ${detail}`);
  }
  return (await res.json()) as T;
}

/** GET /health */
export async function fetchImageHealth(timeoutMs = 5000): Promise<ImageHealth> {
  const base = getSkillRunnerBaseUrl();
  const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
  if (!res.ok) throw new Error(`skill-runner health returned ${res.status}`);
  return (await res.json()) as ImageHealth;
}

/** POST /render */
export async function renderImage(request: RenderRequest, timeoutMs = 300000): Promise<RenderResponse> {
  const payload = {
    skill: request.skill,
    inputs: request.inputs,
    ...(request.aspect ? { aspect: request.aspect } : {}),
    ...(request.outputDir ? { output_dir: request.outputDir } : {}),
  };
  return postJson<RenderResponse>('/render', payload, timeoutMs);
}
