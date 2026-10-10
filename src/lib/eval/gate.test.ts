import { describe, it, expect } from 'vitest';
import type { MetricKey } from './rubric';
import type { Stat } from './stats';
import { nonInferiorityGate, gateReasons, type Aggregate } from './gate';

function stat(median: number | null): Stat {
  return { mean: median, std: 0, median, n: median === null ? 0 : 1 };
}
function agg(medians: Partial<Record<MetricKey, number | null>>): Aggregate {
  // Default every gate dim to 4 so only the overridden metrics differ.
  const base: Aggregate = {
    total: stat(4),
    hook: stat(4),
    audienceFit: stat(4),
    evidence: stat(4),
    platformFit: stat(4),
    originality: stat(4),
  };
  for (const [k, v] of Object.entries(medians)) base[k as MetricKey] = stat(v ?? null);
  return base;
}

describe('nonInferiorityGate', () => {
  it('passes when the candidate is equal or better', () => {
    const gate = nonInferiorityGate(agg({ total: 4, hook: 4 }), agg({ total: 4, hook: 3 }), 0.5);
    expect(gate.ok).toBe(true);
  });

  it('passes at the boundary (cand = base - tolerance)', () => {
    const gate = nonInferiorityGate(agg({ total: 3.5 }), agg({ total: 4 }), 0.5);
    expect(gate.ok).toBe(true);
  });

  it('fails when the candidate drops beyond tolerance', () => {
    const cand = agg({ total: 2 });
    const base = agg({ total: 4 });
    const gate = nonInferiorityGate(cand, base, 0.5);
    expect(gate.ok).toBe(false);
    expect(gateReasons(cand, base, 0.5).some((r) => r.includes('total'))).toBe(true);
  });

  it('fails when a median is missing', () => {
    const gate = nonInferiorityGate(agg({ total: null }), agg({ total: 4 }), 0.5);
    expect(gate.ok).toBe(false);
  });
});
