import { describe, it, expect } from 'vitest';
import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { runRules, checkBannedAndAbsolute, checkSourceEvidence, hardGateTerms } from './rules';
import { parseComplianceRules } from '@/lib/knowledge/loader';

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

  // 回归(HIGH):硬门不得误杀含通用风格词/单字「最」的正常文案。
  it.each([
    '最近发现一个特别好用的 AI 工具,分享给大家',
    '这是最好用的周报模板,附上我的使用心得',
    '这个思路非常实用,我自己也在用',
    '首先说结论,然后拆成三步讲清楚',
    '最后附上我整理的清单',
  ])('passes a clean draft containing benign style words: %s', (body) => {
    const r = checkBannedAndAbsolute(body, emptyRules);
    expect(r.findings).toEqual([]);
    expect(r.passed).toBe(true);
  });

  it('still flags genuine absolute/regulated terms', () => {
    expect(checkBannedAndAbsolute('这是唯一的选择', emptyRules).passed).toBe(false);
    expect(checkBannedAndAbsolute('全网最便宜的方案', { disallowed: ['最便宜'], replacements: {} }).passed).toBe(false);
    expect(checkBannedAndAbsolute('效果最佳', emptyRules).passed).toBe(false);
  });

  it('drops single-char terms from the hard gate', () => {
    const terms = hardGateTerms({ disallowed: ['最', '绝了'], replacements: {} });
    expect(terms).not.toContain('最');
    expect(terms).toContain('绝了');
  });

  it('passes benign drafts against the real compliance.md word list', () => {
    const rules = parseComplianceRules();
    for (const body of [
      '最近发现一个特别好用的 AI 工具,分享给大家',
      '这是最好用的周报模板,附上我的使用心得',
      '这个思路非常实用,我自己也在用',
    ]) {
      expect(checkBannedAndAbsolute(body, rules).passed).toBe(true);
    }
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
