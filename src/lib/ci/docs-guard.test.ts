import { describe, it, expect } from 'vitest';
import { evaluateDocsGuard, SKIP_LABEL } from './docs-guard';

describe('evaluateDocsGuard', () => {
  it('fails when code changes without a matching doc', () => {
    const r = evaluateDocsGuard(['src/lib/compliance/rules.ts', 'src/lib/eval/gate.ts']);
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it('passes when architecture.md is synced with module code', () => {
    const r = evaluateDocsGuard(['src/lib/compliance/rules.ts', 'docs/architecture.md']);
    expect(r.ok).toBe(true);
  });

  it('requires contracts + architecture for contract/type changes', () => {
    const onlyArch = evaluateDocsGuard(['src/lib/types.ts', 'docs/architecture.md']);
    expect(onlyArch.ok).toBe(false);
    const full = evaluateDocsGuard([
      'src/lib/types.ts',
      'docs/architecture.md',
      'docs/contracts/draft.schema.json',
    ]);
    expect(full.ok).toBe(true);
  });

  it('ignores unrelated changes', () => {
    const r = evaluateDocsGuard(['README.md', 'src/app/page.tsx']);
    expect(r.ok).toBe(true);
  });

  it('honours the skip label escape hatch', () => {
    const r = evaluateDocsGuard(['src/lib/compliance/rules.ts'], [SKIP_LABEL]);
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
  });
});
