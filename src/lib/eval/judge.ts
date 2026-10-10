import { extractJsonObject } from '@/lib/parse-llm-json';
import type { JudgeCompleter } from '@/lib/compliance/judge';
import { RUBRIC_DIMS, type RubricScores } from './rubric';
import { toScore, type JudgeRun } from './stats';
import { EVAL_JUDGE_SYSTEM, buildEvalJudgeUserPrompt, type EvalJudgeItem } from './prompts';

export interface EvalDeps {
  completer: JudgeCompleter;
  model: string;
  temperature?: number;
}

function emptyDims(): RubricScores {
  return { hook: null, audienceFit: null, evidence: null, platformFit: null, originality: null };
}

/**
 * 对一个批次稿件做一次 judge 打分,返回一个 run。
 * 解析失败即抛错(不静默给 0/过)。
 */
export async function judgeBatch(items: EvalJudgeItem[], deps: EvalDeps): Promise<JudgeRun> {
  const temperature = deps.temperature ?? 0;
  const raw = await deps.completer({
    system: EVAL_JUDGE_SYSTEM,
    user: buildEvalJudgeUserPrompt(items),
    temperature,
  });
  const obj = extractJsonObject(raw);
  const scoreItems = obj && Array.isArray(obj.items) ? obj.items : null;
  if (!scoreItems) {
    throw new Error('Eval judge returned unparseable output (no `items` array)');
  }
  const byIndex = new Map<number, Record<string, unknown>>();
  for (const entry of scoreItems) {
    if (!entry || typeof entry !== 'object') continue;
    const idx = Number((entry as Record<string, unknown>).index);
    if (Number.isInteger(idx)) byIndex.set(idx, entry as Record<string, unknown>);
  }
  const scored: RubricScores[] = items.map((_, i) => {
    const s = byIndex.get(i);
    const dims = emptyDims();
    if (s) for (const dim of RUBRIC_DIMS) dims[dim] = toScore(s[dim]);
    return dims;
  });
  return { by: `${deps.model}@T${temperature}`, temperature, items: scored };
}
