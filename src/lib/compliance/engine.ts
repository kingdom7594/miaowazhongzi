import type { ContentTopic } from '@/lib/radar/types';
import type { Draft, DraftCompliance } from '@/lib/types';
import type { ComplianceRules } from '@/lib/knowledge/loader';
import { runRules, type RuleResult } from './rules';
import { judgeCompliance, type JudgeCompleter, type ComplianceJudgement } from './judge';

export interface ComplianceDeps {
  completer: JudgeCompleter;
  judgeModel: string;
  rules?: ComplianceRules;
  temperature?: number;
}

export interface ComplianceGateResult {
  compliance: DraftCompliance;
  rules: RuleResult;
  judgement: ComplianceJudgement;
}

function formatFinding(rule: string, detail: string, snippet?: string): string {
  return snippet ? `[${rule}] ${detail}（${snippet}）` : `[${rule}] ${detail}`;
}

/**
 * 「规则 + 独立 judge」双闸门。任一不通过则整体不通过,结果回填 draft.compliance。
 */
export async function runComplianceGate(
  draft: Draft,
  topic: ContentTopic,
  deps: ComplianceDeps,
): Promise<ComplianceGateResult> {
  const ruleResult = runRules(draft, topic, deps.rules);
  const judgement = await judgeCompliance(
    { draft, topic, temperature: deps.temperature },
    deps.completer,
  );
  const risks = [
    ...ruleResult.findings.map((f) => formatFinding(f.rule, f.detail, f.snippet)),
    ...judgement.risks.map((r) => `[judge] ${r}`),
  ];
  const compliance: DraftCompliance = {
    passed: ruleResult.passed && judgement.passed,
    risks,
    checkedBy: `rule+judge(${deps.judgeModel})`,
  };
  return { compliance, rules: ruleResult, judgement };
}
