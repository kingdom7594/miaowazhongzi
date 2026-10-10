import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { BANNED_WORDS } from '@/lib/banned-words';
import { parseComplianceRules, type ComplianceRules } from '@/lib/knowledge/loader';

export interface RuleFinding {
  rule: string;
  detail: string;
  snippet?: string;
}

export interface RuleResult {
  passed: boolean;
  findings: RuleFinding[];
}

/**
 * 广告法式绝对化用语(与 compliance.md 词库互补,补其未覆盖的常见词)。
 * 与词库重叠的词已由 banned-word 规则覆盖,这里只补增量。
 */
export const ABSOLUTE_TERMS: string[] = [
  '国家级',
  '最佳',
  '顶级',
  '极致',
  '唯一',
  '首个',
  '独家',
  '史无前例',
  '万能',
  '百分百',
  '绝无仅有',
  '不可替代',
];

const NO_DIRECT_SIGNAL = '无直接信号';

function collectHits(text: string, terms: string[]): string[] {
  const hits: string[] = [];
  for (const term of terms) {
    if (!term) continue;
    if (text.includes(term) && !hits.includes(term)) hits.push(term);
  }
  return hits;
}

/** 违规词 + 绝对化用语(规则层,离线纯函数)。 */
export function checkBannedAndAbsolute(text: string, rules: ComplianceRules): RuleResult {
  const findings: RuleFinding[] = [];
  const banned = collectHits(text, [...BANNED_WORDS, ...rules.disallowed]);
  for (const word of banned) {
    findings.push({
      rule: 'banned-word',
      detail: `命中违规/敏感词「${word}」`,
      snippet: rules.replacements[word] ? `建议改为:${rules.replacements[word]}` : undefined,
    });
  }
  const absolute = collectHits(text, ABSOLUTE_TERMS);
  for (const word of absolute) {
    if (banned.includes(word)) continue;
    findings.push({ rule: 'absolute-term', detail: `命中绝对化用语「${word}」` });
  }
  return { passed: findings.length === 0, findings };
}

/** topic.evidence 是否提供了可追溯、非占位符的来源 URL。 */
function hasTraceableSource(topic: ContentTopic): boolean {
  return (topic.evidence ?? []).some(
    (e) => typeof e.url === 'string' && e.url.trim().length > 0 && !e.url.includes(NO_DIRECT_SIGNAL),
  );
}

/**
 * 数据来源必填 + 来源 URL(离线)。
 * 正文含数字/数据时,选题必须提供可追溯来源;evidence 条目必须带 url。
 * 不做 URL 实活抓取 —— 只校验「存在 + 可映射」。
 */
export function checkSourceEvidence(draft: Draft, topic: ContentTopic): RuleResult {
  const findings: RuleFinding[] = [];
  const evidence = topic.evidence ?? [];

  for (const [i, e] of evidence.entries()) {
    if (!e.url || !e.url.trim()) {
      findings.push({ rule: 'evidence-url-missing', detail: `选题依据[${i}]「${e.claim}」缺少来源 URL` });
    }
  }

  const text = [draft.body, ...(draft.titles ?? [])].join('\n');
  const hasNumbers = /\d/.test(text);
  if (hasNumbers && !hasTraceableSource(topic)) {
    findings.push({
      rule: 'source-required',
      detail: '正文/标题含数字或数据,但选题没有可追溯的来源 URL(不得编造数字)',
    });
  }

  return { passed: findings.length === 0, findings };
}

/** 运行全部离线规则。 */
export function runRules(
  draft: Draft,
  topic: ContentTopic,
  rules: ComplianceRules = parseComplianceRules(),
): RuleResult {
  const text = [draft.body, ...(draft.titles ?? [])].join('\n');
  const banned = checkBannedAndAbsolute(text, rules);
  const source = checkSourceEvidence(draft, topic);
  const findings = [...banned.findings, ...source.findings];
  return { passed: findings.length === 0, findings };
}
