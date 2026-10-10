import { describe, it, expect } from 'vitest';
import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { judgeBatch } from './judge';
import type { EvalJudgeItem } from './prompts';

const topic: ContentTopic = { id: 't1', headline: '选题', platforms: ['xiaohongshu'] };
function item(body = '正文'): EvalJudgeItem {
  return { topic, draft: { topicId: 't1', platform: 'xiaohongshu', body } as Draft };
}

describe('judgeBatch', () => {
  it('parses per-item dims and stamps by', async () => {
    const run = await judgeBatch([item(), item()], {
      completer: async () =>
        JSON.stringify({
          items: [
            { index: 0, hook: 4, audienceFit: 3, evidence: 5, platformFit: 4, originality: 2 },
            { index: 1, hook: 2, audienceFit: 2, evidence: 3, platformFit: 4, originality: 5 },
          ],
        }),
      model: 'deepseek-reasoner',
      temperature: 0.3,
    });
    expect(run.by).toBe('deepseek-reasoner@T0.3');
    expect(run.items[0].hook).toBe(4);
    expect(run.items[1].originality).toBe(5);
  });

  it('leaves missing items as nulls (does not invent scores)', async () => {
    const run = await judgeBatch([item(), item()], {
      completer: async () => JSON.stringify({ items: [{ index: 0, hook: 5 }] }),
      model: 'm',
    });
    expect(run.items[0].hook).toBe(5);
    expect(run.items[1].hook).toBeNull();
  });

  it('throws on unparseable output', async () => {
    await expect(judgeBatch([item()], { completer: async () => 'nope', model: 'm' })).rejects.toThrow();
  });
});
