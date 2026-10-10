import { describe, it, expect } from 'vitest';
import { parseDraftJson } from '../parse-llm-json';
import { produceDraftForPlatform } from './drafts';
import type { ContentTopic } from '../radar/types';

const topic: ContentTopic = {
  id: 't-2026-10-10-01',
  headline: '月入4.6万美元的AI自拍App在掉量',
  platforms: ['xiaohongshu'],
  corePoints: ['要点'],
  evidence: [{ claim: '证据', url: 'https://example.com' }],
};

describe('parseDraftJson', () => {
  it('parses a fenced JSON object', () => {
    const draft = parseDraftJson(
      '```json\n{"titles":["t1"],"body":"正文","tags":["#a"],"coverPrompt":"c"}\n```',
      topic.id,
      'xiaohongshu',
    );
    expect(draft?.body).toBe('正文');
    expect(draft?.topicId).toBe(topic.id);
  });

  it('returns null on non-JSON output', () => {
    expect(parseDraftJson('sorry, I cannot', topic.id, 'xiaohongshu')).toBeNull();
  });
});

describe('produceDraftForPlatform', () => {
  it('produces a contract-valid draft from completer output', async () => {
    const result = await produceDraftForPlatform(topic, 'xiaohongshu', {
      completer: async () =>
        JSON.stringify({
          titles: ['标题'],
          body: '这是正文内容',
          tags: ['#AI'],
          coverPrompt: 'cover',
          compliance: { passed: true, risks: [] },
          scores: { hook: 8, evidence: 7, platformFit: 9 },
        }),
    });
    expect(result.error).toBeUndefined();
    expect(result.draft?.body).toBe('这是正文内容');
    expect(result.draft?.scores?.hook).toBe(8);
  });

  it('surfaces a parse failure as an error (no mock fallback)', async () => {
    const result = await produceDraftForPlatform(topic, 'xiaohongshu', {
      completer: async () => 'not json at all',
    });
    expect(result.draft).toBeUndefined();
    expect(result.error).toBeTruthy();
  });
});
