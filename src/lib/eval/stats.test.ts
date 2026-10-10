import { describe, it, expect } from 'vitest';
import type { RubricScores } from './rubric';
import { toScore, mean, std, median, computeStat, runMetric, aggregate, type JudgeRun } from './stats';

function dims(v: Partial<RubricScores> = {}): RubricScores {
  return { hook: null, audienceFit: null, evidence: null, platformFit: null, originality: null, ...v };
}

describe('toScore', () => {
  it('coerces to 1-5 integers', () => {
    expect(toScore(3)).toBe(3);
    expect(toScore('4')).toBe(4);
    expect(toScore(3.6)).toBe(4);
  });
  it('rejects out-of-range / non-numeric', () => {
    expect(toScore(0)).toBeNull();
    expect(toScore(6)).toBeNull();
    expect(toScore('x')).toBeNull();
    expect(toScore(null)).toBeNull();
    expect(toScore('')).toBeNull();
  });
});

describe('descriptive stats', () => {
  it('mean/std/median', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(std([1, 2, 3])).toBe(0.816);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('excludes nulls (does not zero-fill)', () => {
    const st = computeStat([3, null, 5]);
    expect(st.n).toBe(2);
    expect(st.mean).toBe(4);
  });
});

describe('runMetric', () => {
  it('averages per dim and computes total over all dim values', () => {
    const run: JudgeRun = {
      by: 'm@T0',
      temperature: 0,
      items: [dims({ hook: 4, evidence: 2 }), dims({ hook: 2, evidence: 4 })],
    };
    const m = runMetric(run);
    expect(m.hook).toBe(3);
    expect(m.evidence).toBe(3);
    expect(m.total).toBe(3);
  });
});

describe('aggregate', () => {
  it('uses the run as the sample unit', () => {
    const runA: JudgeRun = { by: 'a', temperature: 0, items: [dims({ hook: 2 })] };
    const runB: JudgeRun = { by: 'b', temperature: 0, items: [dims({ hook: 4 })] };
    const agg = aggregate([runA, runB]);
    expect(agg.hook.n).toBe(2);
    expect(agg.hook.median).toBe(3);
    expect(agg.hook.mean).toBe(3);
  });
});
