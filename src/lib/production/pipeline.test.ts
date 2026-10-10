import { describe, it, expect } from 'vitest';
import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { validateDraft } from '@/lib/contracts/validate';
import type { JudgeCompleter } from '@/lib/compliance/judge';
import { evaluateDraft, produceAndEvaluate } from './pipeline';

const topic: ContentTopic = { id: 't1', headline: '选题', platforms: ['xiaohongshu'] };

const judgeCompleter: JudgeCompleter = async ({ system }) => {
  if (system.includes('合规审核员')) {
    return JSON.stringify({ passed: true, risks: [], notes: '' });
  }
  if (system.includes('内容质量评审')) {
    return JSON.stringify({
      items: [{ index: 0, hook: 4, audienceFit: 4, evidence: 4, platformFit: 4, originality: 4 }],
    });
  }
  throw new Error(`unexpected judge prompt: ${system.slice(0, 20)}`);
};

describe('evaluateDraft', () => {
  it('fills compliance.checkedBy and scores.by and stays contract-valid', async () => {
    const draft: Draft = { topicId: 't1', platform: 'xiaohongshu', body: '这是一份实用资料,分享给大家' };
    const evaluated = await evaluateDraft(draft, topic, {
      judgeCompleter,
      judgeModel: 'deepseek-reasoner',
    });
    expect(evaluated.compliance?.checkedBy).toBe('rule+judge(deepseek-reasoner)');
    expect(evaluated.scores?.by).toBe('deepseek-reasoner@T0');
    expect(evaluated.scores?.audienceFit).toBe(4);
    expect(validateDraft(evaluated).valid).toBe(true);
  });
});

describe('produceAndEvaluate', () => {
  const generatorCompleter = async () =>
    JSON.stringify({ titles: ['标题'], body: '这是正文', tags: ['#a'], coverPrompt: 'c' });

  it('skips L5 gates when skipEval is set', async () => {
    const result = await produceAndEvaluate(topic, 'xiaohongshu', {
      completer: generatorCompleter,
      skipEval: true,
    });
    expect(result.error).toBeUndefined();
    expect(result.draft?.body).toBe('这是正文');
    expect(result.draft?.compliance).toBeUndefined();
  });

  it('runs L5 gates by default when an evaluator is provided', async () => {
    const result = await produceAndEvaluate(topic, 'xiaohongshu', {
      completer: generatorCompleter,
      evaluator: { judgeCompleter, judgeModel: 'deepseek-reasoner' },
    });
    expect(result.draft?.compliance?.checkedBy).toContain('rule+judge');
    expect(result.draft?.scores?.by).toBe('deepseek-reasoner@T0');
  });

  it('errors when gates are requested without an evaluator', async () => {
    await expect(
      produceAndEvaluate(topic, 'xiaohongshu', { completer: generatorCompleter }),
    ).rejects.toThrow(/evaluator is required/);
  });
});
