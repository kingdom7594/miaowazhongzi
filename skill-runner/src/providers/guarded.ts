import { ProviderError } from './errors.js';
import type { GeneratedImage, GenerateImageInput, ImageProvider } from './types.js';

/** 简单计数信号量（FIFO）。 */
export class Semaphore {
  private available: number;
  private readonly queue: Array<() => void> = [];

  constructor(size: number) {
    this.available = Math.max(1, Math.floor(size));
  }

  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available -= 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) next();
    else this.available += 1;
  }
}

/**
 * 成本闸 provider 包装（ADR-0006 成本约束）：
 * - **全局并发**信号量（`concurrency`）跨所有路径（直连 + shim/agent）生效；
 * - **单次 render 累计张数**上限（`maxPerRender`），按 `renderId` 计数。
 * 使组装式 skill（经 shim 出图）同样受 `MAX_IMAGES_PER_RENDER` / `RENDER_CONCURRENCY` 约束。
 */
export class GuardedProvider implements ImageProvider {
  readonly name: string;
  private readonly semaphore: Semaphore;
  private readonly counts = new Map<string, number>();

  constructor(
    private readonly inner: ImageProvider,
    private readonly maxPerRender: number,
    concurrency: number,
  ) {
    this.name = inner.name;
    this.semaphore = new Semaphore(concurrency);
  }

  async generate(input: GenerateImageInput, outputDir: string): Promise<GeneratedImage> {
    const renderId = input.renderId ?? 'global';
    const used = this.counts.get(renderId) ?? 0;
    if (used >= this.maxPerRender) {
      throw new ProviderError(
        'quota_exceeded',
        `render "${renderId}" exceeded MAX_IMAGES_PER_RENDER=${this.maxPerRender}`,
      );
    }
    this.counts.set(renderId, used + 1);
    await this.semaphore.acquire();
    try {
      return await this.inner.generate(input, outputDir);
    } finally {
      this.semaphore.release();
    }
  }

  clearRender(renderId: string): void {
    this.counts.delete(renderId);
  }

  /** 测试/诊断：某会话已生成的张数。 */
  countFor(renderId: string): number {
    return this.counts.get(renderId) ?? 0;
  }
}
