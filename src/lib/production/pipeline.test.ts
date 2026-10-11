import { describe, it, expect } from 'vitest';
import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { validateDraft } from '@/lib/contracts/validate';
import type { JudgeCompleter } from '@/lib/compliance/judge';
import { evaluateDraft, produceAndEvaluate, produceBatchIsolated } from './pipeline';

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

describe('produceBatchIsolated (F-02 单平台降级隔离)', () => {
  const generatorCompleter = async () =>
    JSON.stringify({ titles: ['标题'], body: '这是正文', tags: ['#a'], coverPrompt: 'c' });

  it('保留成功 draft:单平台 judge 失败不丢正文、不中断其它平台', async () => {
    let calls = 0;
    const flakyJudge: JudgeCompleter = async ({ system }) => {
      calls += 1;
      if (calls === 1) throw new Error('judge unreachable');
      if (system.includes('合规审核员')) {
        return JSON.stringify({ passed: true, risks: [], notes: '' });
      }
      return JSON.stringify({
        items: [{ index: 0, hook: 4, audienceFit: 4, evidence: 4, platformFit: 4, originality: 4 }],
      });
    };

    const results = await produceBatchIsolated(topic, ['xiaohongshu', 'douyin'], {
      completer: generatorCompleter,
      evaluator: { judgeCompleter: flakyJudge, judgeModel: 'deepseek-reasoner' },
    });

    expect(results).toHaveLength(2);
    // 第一平台评估失败:正文保留 + error 标注,compliance 未回填。
    expect(results[0].draft?.body).toBe('这是正文');
    expect(results[0].error).toMatch(/评估失败/);
    expect(results[0].draft?.compliance).toBeUndefined();
    // 第二平台不受影响,正常过闸门。
    expect(results[1].error).toBeUndefined();
    expect(results[1].draft?.compliance?.checkedBy).toContain('rule+judge');
  });
});
