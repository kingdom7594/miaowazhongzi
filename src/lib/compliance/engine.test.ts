import { describe, it, expect } from 'vitest';
import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { runComplianceGate } from './engine';
import type { JudgeCompleter } from './judge';

const topic: ContentTopic = {
  id: 't1',
  headline: '选题',
  platforms: ['xiaohongshu'],
  evidence: [{ claim: '增长 30%', url: 'https://example.com/a' }],
};

function judgeReturning(passed: boolean): JudgeCompleter {
  return async () => JSON.stringify({ passed, risks: passed ? [] : ['风险点'], notes: '' });
}

describe('runComplianceGate', () => {
  it('passes and stamps checkedBy when rules + judge pass', async () => {
    const draft: Draft = { topicId: 't1', platform: 'xiaohongshu', body: '这是一份实用资料,增长了 30%' };
    const { compliance } = await runComplianceGate(draft, topic, {
      completer: judgeReturning(true),
      judgeModel: 'deepseek-reasoner',
    });
    expect(compliance.passed).toBe(true);
    expect(compliance.checkedBy).toBe('rule+judge(deepseek-reasoner)');
  });

  it('fails when the judge fails even if rules pass', async () => {
    const draft: Draft = { topicId: 't1', platform: 'xiaohongshu', body: '这是一份实用资料,增长了 30%' };
    const { compliance } = await runComplianceGate(draft, topic, {
      completer: judgeReturning(false),
      judgeModel: 'deepseek-reasoner',
    });
    expect(compliance.passed).toBe(false);
    expect(compliance.risks.some((r) => r.startsWith('[judge]'))).toBe(true);
  });

  it('fails when rules fail even if the judge passes', async () => {
    const draft: Draft = { topicId: 't1', platform: 'xiaohongshu', body: '这是唯一的选择' };
    const { compliance } = await runComplianceGate(draft, topic, {
      completer: judgeReturning(true),
      judgeModel: 'deepseek-reasoner',
    });
    expect(compliance.passed).toBe(false);
    expect(compliance.risks.some((r) => r.startsWith('[absolute-term]'))).toBe(true);
  });
});
