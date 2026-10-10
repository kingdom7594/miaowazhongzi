import { describe, expect, it } from 'vitest';
import { GuardedProvider } from '../src/providers/guarded.js';
import type { GenerateImageInput, ImageProvider } from '../src/providers/types.js';

function countingProvider(active?: { current: number; peak: number }): ImageProvider {
  return {
    name: 'counting',
    async generate(input: GenerateImageInput, outputDir: string) {
      if (active) {
        active.current += 1;
        active.peak = Math.max(active.peak, active.current);
        await new Promise((r) => setTimeout(r, 5));
        active.current -= 1;
      }
      return { localPath: `${outputDir}/${input.filenameHint ?? 'x'}.png`, width: 1, height: 1, provider: 'counting', model: 'm' };
    },
  };
}

describe('GuardedProvider', () => {
  it('caps the number of images per render session', async () => {
    const guarded = new GuardedProvider(countingProvider(), 2, 4);
    await guarded.generate({ prompt: 'a', renderId: 'r1' }, '/tmp');
    await guarded.generate({ prompt: 'b', renderId: 'r1' }, '/tmp');
    await expect(guarded.generate({ prompt: 'c', renderId: 'r1' }, '/tmp')).rejects.toMatchObject({
      code: 'quota_exceeded',
    });
    // 其他会话不受影响
    await guarded.generate({ prompt: 'd', renderId: 'r2' }, '/tmp');
  });

  it('clearRender releases a session counter', async () => {
    const guarded = new GuardedProvider(countingProvider(), 1, 4);
    await guarded.generate({ prompt: 'a', renderId: 'r1' }, '/tmp');
    guarded.clearRender('r1');
    await expect(guarded.generate({ prompt: 'b', renderId: 'r1' }, '/tmp')).resolves.toBeTruthy();
  });

  it('limits global concurrency', async () => {
    const active = { current: 0, peak: 0 };
    const guarded = new GuardedProvider(countingProvider(active), 10, 2);
    await Promise.all(
      Array.from({ length: 6 }, (_, i) => guarded.generate({ prompt: `p${i}`, renderId: `r${i}` }, '/tmp')),
    );
    expect(active.peak).toBeLessThanOrEqual(2);
  });
});
