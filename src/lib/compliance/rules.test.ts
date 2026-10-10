import { describe, it, expect } from 'vitest';
import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { runRules, checkBannedAndAbsolute, checkSourceEvidence } from './rules';

const emptyRules = { disallowed: [], replacements: {} };

function topic(overrides: Partial<ContentTopic> = {}): ContentTopic {
  return { id: 't1', headline: '选题', platforms: ['xiaohongshu'], ...overrides };
}
function draft(body: string, titles: string[] = []): Draft {
  return { topicId: 't1', platform: 'xiaohongshu', body, titles };
}

describe('checkBannedAndAbsolute', () => {
  it('passes a clean draft', () => {
    const r = checkBannedAndAbsolute('这是一份实用的资料,分享给大家', emptyRules);
    expect(r.passed).toBe(true);
    expect(r.findings).toHaveLength(0);
  });

  it('flags absolute terms', () => {
    const r = checkBannedAndAbsolute('这是唯一的选择', emptyRules);
    expect(r.passed).toBe(false);
    expect(r.findings.some((f) => f.rule === 'absolute-term')).toBe(true);
  });

  it('flags banned words with replacement hints', () => {
    const r = checkBannedAndAbsolute('这本书绝了', { disallowed: ['绝了'], replacements: { 绝了: '很不错' } });
    expect(r.passed).toBe(false);
    const f = r.findings.find((x) => x.rule === 'banned-word');
    expect(f?.snippet).toContain('很不错');
  });
});

describe('checkSourceEvidence', () => {
  it('fails when the body cites numbers but the topic has no traceable source', () => {
    const r = checkSourceEvidence(draft('今年增长了 30%'), topic());
    expect(r.passed).toBe(false);
    expect(r.findings.some((f) => f.rule === 'source-required')).toBe(true);
  });

  it('passes when numbers map to an evidence url', () => {
    const r = checkSourceEvidence(
      draft('今年增长了 30%'),
      topic({ evidence: [{ claim: '增长 30%', url: 'https://example.com/a' }] }),
    );
    expect(r.passed).toBe(true);
  });

  it('flags evidence entries missing a url', () => {
    const r = checkSourceEvidence(
      draft('纯文字,无数字'),
      topic({ evidence: [{ claim: '增长', url: '' }] }),
    );
    expect(r.passed).toBe(false);
    expect(r.findings.some((f) => f.rule === 'evidence-url-missing')).toBe(true);
  });

  it('treats a (无直接信号) placeholder url as non-traceable', () => {
    const r = checkSourceEvidence(
      draft('今年增长了 30%'),
      topic({ evidence: [{ claim: '无', url: '(无直接信号)' }] }),
    );
    expect(r.passed).toBe(false);
  });
});

describe('runRules', () => {
  it('combines banned + source findings', () => {
    const r = runRules(draft('绝了,增长了 30%'), topic(), { disallowed: ['绝了'], replacements: {} });
    expect(r.passed).toBe(false);
    expect(r.findings.length).toBeGreaterThanOrEqual(2);
  });
});
