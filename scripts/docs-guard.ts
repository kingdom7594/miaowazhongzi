#!/usr/bin/env tsx
/**
 * docs-guard CLI(ADR-0005)。
 * 用法:tsx scripts/docs-guard.ts [--base <ref>] [--labels a,b]
 * 或环境变量:DOCS_GUARD_BASE / DOCS_GUARD_LABELS
 */
import { execFileSync } from 'node:child_process';
import { evaluateDocsGuard, formatViolations } from '../src/lib/ci/docs-guard';

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const base = argValue('--base') ?? process.env.DOCS_GUARD_BASE ?? 'origin/main';
const labels = (argValue('--labels') ?? process.env.DOCS_GUARD_LABELS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let changedFiles: string[] = [];
try {
  const out = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
  changedFiles = out.split('\n').map((s) => s.trim()).filter(Boolean);
} catch (err) {
  console.error(`docs-guard: 无法计算 diff (${base}...HEAD):`, err instanceof Error ? err.message : err);
  process.exit(2);
}

const result = evaluateDocsGuard(changedFiles, labels);
if (result.skipped) {
  console.log(`docs-guard: 跳过(标签 ${'docs-guard: skip'})`);
  process.exit(0);
}
if (result.ok) {
  console.log(`docs-guard: OK(检查 ${changedFiles.length} 个变更文件)`);
  process.exit(0);
}
console.error('docs-guard: FAIL — 代码变更未同步文档:\n' + formatViolations(result));
process.exit(1);
