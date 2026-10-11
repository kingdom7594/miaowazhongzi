import type { ContentTopic } from '@/lib/radar/types';
import type { Draft, DraftScores } from '@/lib/types';
import type { ComplianceRules } from '@/lib/knowledge/loader';
import type { JudgeCompleter } from '@/lib/compliance/judge';
import { runComplianceGate } from '@/lib/compliance/engine';
import { judgeBatch } from '@/lib/eval/judge';
import { RUBRIC_DIMS } from '@/lib/eval/rubric';
import {
  produceDraftForPlatform,
  type ProduceOptions,
  type ProduceResult,
} from './drafts';

export interface EvaluateDeps {
  /** 独立 judge 调用(与生成 completer 分离)。 */
  judgeCompleter: JudgeCompleter;
  judgeModel: string;
  /** 质量评审模型;缺省与合规 judge 同模型。 */
  evalModel?: string;
  evalTemperature?: number;
  rules?: ComplianceRules;
}

export interface PipelineOptions extends ProduceOptions {
  /** 关闭 L5 双闸门(仅生成)。 */
  skipEval?: boolean;
  evaluator?: EvaluateDeps;
}

function requireEvaluator(options: PipelineOptions): EvaluateDeps {
  if (!options.evaluator) {
    throw new Error('evaluator is required to run L5 gates (or set skipEval to bypass).');
  }
  return options.evaluator;
}

/** 对单份 draft 跑「规则 + judge」合规闸门 + 质量评审,回填可选字段。 */
export async function evaluateDraft(
  draft: Draft,
  topic: ContentTopic,
  deps: EvaluateDeps,
): Promise<Draft> {
  const { compliance } = await runComplianceGate(draft, topic, {
    completer: deps.judgeCompleter,
    judgeModel: deps.judgeModel,
    rules: deps.rules,
  });
  const run = await judgeBatch([{ draft, topic }], {
    completer: deps.judgeCompleter,
    model: deps.evalModel ?? deps.judgeModel,
    temperature: deps.evalTemperature,
  });
  const dims = run.items[0];
  const scores: DraftScores = { by: run.by };
  for (const dim of RUBRIC_DIMS) {
    const value = dims[dim];
    if (value !== null) scores[dim] = value;
  }
  return { ...draft, compliance, scores };
}

/** 生成单份 draft 并(默认)过 L5 双闸门。 */
export async function produceAndEvaluate(
  topic: ContentTopic,
  platform: string,
  options: PipelineOptions,
): Promise<ProduceResult> {
  const result = await produceDraftForPlatform(topic, platform, options);
  if (result.error || !result.draft) return result;
  if (options.skipEval) return result;
  const draft = await evaluateDraft(result.draft, topic, requireEvaluator(options));
  return { ...result, draft };
}

/** 生成单份 draft,单平台失败隔离(F-02):评估失败不丢弃已生成正文,随 error 一并返回。 */
export async function produceAndEvaluateIsolated(
  topic: ContentTopic,
  platform: string,
  options: PipelineOptions,
): Promise<ProduceResult> {
  const result = await produceDraftForPlatform(topic, platform, options);
  if (result.error || !result.draft) return result;
  if (options.skipEval) return result;
  try {
    const draft = await evaluateDraft(result.draft, topic, requireEvaluator(options));
    return { ...result, draft };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'evaluation failed';
    // 保留 generated draft,仅标注 L5 评估失败(不整批丢失已付费产出)。
    return { platform, draft: result.draft, error: `L5 评估失败(正文已保留): ${message}` };
  }
}

/** 批量生成,逐平台隔离:任一平台出错不影响其它平台入库。 */
export async function produceBatchIsolated(
  topic: ContentTopic,
  platforms: string[],
  options: PipelineOptions,
): Promise<ProduceResult[]> {
  const results: ProduceResult[] = [];
  for (const platform of platforms) {
    results.push(await produceAndEvaluateIsolated(topic, platform, options));
  }
  return results;
}

/** 批量生成并(默认)过 L5 双闸门(逐平台隔离,失败不中断整批)。 */
export async function produceDraftsForTopicEvaluated(
  topic: ContentTopic,
  platforms: string[],
  options: PipelineOptions,
): Promise<ProduceResult[]> {
  return produceBatchIsolated(topic, platforms, options);
}
