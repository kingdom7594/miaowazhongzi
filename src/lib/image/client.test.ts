import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderImage, fetchImageHealth } from './client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('skill-runner image client (explicit failure, no fallback)', () => {
  it('throws when the network request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(renderImage({ skill: 'baoyu-image-gen', inputs: { prompt: 'a cat' } })).rejects.toThrow(
      /skill-runner request failed/,
    );
  });

  it('throws on non-2xx with the server error detail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'not configured' }), { status: 502 }),
    );
    await expect(renderImage({ skill: 'baoyu-image-gen', inputs: { prompt: 'a cat' } })).rejects.toThrow(
      /skill-runner returned 502/,
    );
  });

  it('posts the render contract and returns files', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ skill: 'baoyu-image-gen', files: [{ path: '/x.png', width: 1, height: 1 }], meta: {} })),
    );
    const result = await renderImage({ skill: 'baoyu-xhs-images', inputs: { prompts: ['a'] }, aspect: '3:4', outputDir: '/out' });
    expect(result.files).toHaveLength(1);
    const body = JSON.parse((spy.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toEqual({ skill: 'baoyu-xhs-images', inputs: { prompts: ['a'] }, aspect: '3:4', output_dir: '/out' });
  });

  it('health throws on non-2xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('down', { status: 503 }));
    await expect(fetchImageHealth()).rejects.toThrow(/health returned 503/);
  });
});
