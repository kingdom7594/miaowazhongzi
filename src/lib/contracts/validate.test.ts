import { describe, it, expect } from 'vitest';
import { validateDraft, validateContentBrief } from './validate';

describe('contract validation', () => {
  it('accepts a valid draft', () => {
    const result = validateDraft({
      topicId: 't-2026-10-10-01',
      platform: 'xiaohongshu',
      titles: ['a', 'b'],
      body: '正文',
      tags: ['#AI'],
      coverPrompt: 'cover',
      compliance: { passed: true, risks: [], checkedBy: 'rule+judge' },
      scores: {
        hook: 8,
        audienceFit: 7,
        evidence: 7,
        platformFit: 9,
        originality: 6,
        by: 'judge',
      },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects a draft missing body', () => {
    const result = validateDraft({ topicId: 'x', platform: 'xiaohongshu' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects an unknown platform (contract enum)', () => {
    const result = validateDraft({ topicId: 'x', platform: 'weibo', body: 'y' });
    expect(result.valid).toBe(false);
  });

  it('validates a contentBrief', () => {
    const result = validateContentBrief({
      date: '2026-10-10',
      topics: [{ id: 't-1', headline: 'h', platforms: ['xiaohongshu'] }],
    });
    expect(result.valid).toBe(true);
  });
});
