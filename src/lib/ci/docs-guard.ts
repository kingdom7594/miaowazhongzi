/**
 * docs-guard(ADR-0005):代码路径变更但未同步 `docs/` ⇒ 失败。
 * 纯函数,便于单测;CLI 见 scripts/docs-guard.ts。
 */

export interface DocsGuardMapping {
  /** 触发门禁的代码路径前缀。 */
  code: string[];
  /** 需要同步的文档路径前缀(命中任一即可)。 */
  docs: string[];
}

export const DEFAULT_MAPPINGS: DocsGuardMapping[] = [
  // 契约/类型变更 ⇒ 契约文档 + 架构文档都要同步(两条独立检查 = AND)。
  {
    code: ['src/lib/contracts/', 'docs/contracts/', 'src/lib/types.ts'],
    docs: ['docs/contracts/'],
  },
  {
    code: ['src/lib/contracts/', 'docs/contracts/', 'src/lib/types.ts'],
    docs: ['docs/architecture.md'],
  },
  {
    code: [
      'src/lib/production/',
      'src/lib/prompts.ts',
      'src/lib/compliance/',
      'src/lib/eval/',
      'src/lib/ai/client.ts',
      'src/app/api/drafts/',
    ],
    docs: ['docs/architecture.md'],
  },
  {
    code: ['skill-runner/'],
    docs: ['docs/architecture.md'],
  },
];

/** PR 逃生标签:显式声明本次不动架构文档。 */
export const SKIP_LABEL = 'docs-guard: skip';

export interface DocsGuardViolation {
  mapping: DocsGuardMapping;
  changedCode: string[];
}

export interface DocsGuardResult {
  ok: boolean;
  skipped: boolean;
  violations: DocsGuardViolation[];
}

function startsWithAny(file: string, prefixes: string[]): boolean {
  return prefixes.some((p) => file.startsWith(p));
}

export function evaluateDocsGuard(
  changedFiles: string[],
  labels: string[] = [],
  mappings: DocsGuardMapping[] = DEFAULT_MAPPINGS,
): DocsGuardResult {
  if (labels.includes(SKIP_LABEL)) {
    return { ok: true, skipped: true, violations: [] };
  }
  const violations: DocsGuardViolation[] = [];
  for (const mapping of mappings) {
    const changedCode = changedFiles.filter((f) => startsWithAny(f, mapping.code));
    if (changedCode.length === 0) continue;
    const docsChanged = changedFiles.some((f) => startsWithAny(f, mapping.docs));
    if (!docsChanged) violations.push({ mapping, changedCode });
  }
  return { ok: violations.length === 0, skipped: false, violations };
}

export function formatViolations(result: DocsGuardResult): string {
  return result.violations
    .map(
      (v) =>
        `代码变更 ${v.changedCode.join(', ')} ⇒ 需同步文档 ${v.mapping.docs.join(' 或 ')}`,
    )
    .join('\n');
}
