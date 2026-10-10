import { describe, it, expect } from 'vitest';
import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { judgeCompliance } from './judge';

const topic: ContentTopic = { id: 't1', headline: '选题', platforms: ['xiaohongshu'] };
const draft: Draft = { topicId: 't1', platform: 'xiaohongshu', body: '正文' };

describe('judgeCompliance', () => {
  it('parses a passing judgement', async () => {
    const result = await judgeCompliance({ draft, topic }, async () =>
      '```json\n{"passed": true, "risks": [], "notes": "ok"}\n```',
    );
    expect(result.passed).toBe(true);
    expect(result.notes).toBe('ok');
  });

  it('parses risks from a failing judgement', async () => {
    const result = await judgeCompliance({ draft, topic }, async () =>
      JSON.stringify({ passed: false, risks: ['承诺收益'], notes: '删掉' }),
    );
    expect(result.passed).toBe(false);
    expect(result.risks).toEqual(['承诺收益']);
  });

  it('throws on unparseable output (never silently passes)', async () => {
    await expect(judgeCompliance({ draft, topic }, async () => 'not json at all')).rejects.toThrow();
  });
});
