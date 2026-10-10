import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { extractJsonObject } from '@/lib/parse-llm-json';
import { COMPLIANCE_JUDGE_SYSTEM, buildComplianceJudgeUserPrompt } from './prompts';

export interface JudgeCompleterInput {
  system: string;
  user: string;
  temperature: number;
}

/** 独立的判分调用(与生成调用分离,可注入不同模型/配置)。 */
export type JudgeCompleter = (input: JudgeCompleterInput) => Promise<string>;

export interface ComplianceJudgement {
  passed: boolean;
  risks: string[];
  notes: string;
}

export interface ComplianceJudgeInput {
  draft: Draft;
  topic: ContentTopic;
  temperature?: number;
}

/**
 * 独立 LLM 合规 judge。解析失败即抛错,绝不静默判过(避免把故障当合规)。
 */
export async function judgeCompliance(
  input: ComplianceJudgeInput,
  completer: JudgeCompleter,
): Promise<ComplianceJudgement> {
  const raw = await completer({
    system: COMPLIANCE_JUDGE_SYSTEM,
    user: buildComplianceJudgeUserPrompt(input.draft, input.topic),
    temperature: input.temperature ?? 0,
  });
  const obj = extractJsonObject(raw);
  if (!obj || typeof obj.passed !== 'boolean') {
    throw new Error('Compliance judge returned unparseable output (no boolean `passed`)');
  }
  const risks = Array.isArray(obj.risks) ? obj.risks.map(String).filter(Boolean) : [];
  return {
    passed: obj.passed,
    risks,
    notes: typeof obj.notes === 'string' ? obj.notes : '',
  };
}
