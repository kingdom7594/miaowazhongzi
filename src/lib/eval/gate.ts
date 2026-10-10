import { GATE_DIMS, DEFAULT_TOLERANCE, type MetricKey } from './rubric';
import type { Stat } from './stats';

export interface Gate {
  ok: boolean;
  tolerance: number;
  checks: Record<string, boolean>;
}

export type Aggregate = Record<MetricKey, Stat>;

/**
 * 中位数非劣检验:cand_median >= base_median - tolerance。
 * None → FAIL,不抛异常。语义:允许候选最多落后基线「半个等级」。
 */
export function nonInferiorityGate(
  cand: Aggregate,
  base: Aggregate,
  tolerance: number = DEFAULT_TOLERANCE,
  dims: MetricKey[] = GATE_DIMS,
): Gate {
  const checks: Record<string, boolean> = {};
  for (const key of dims) {
    const c = cand[key]?.median;
    const b = base[key]?.median;
    checks[`${key}_not_lower`] = c !== null && c !== undefined && b !== null && b !== undefined && c >= b - tolerance;
  }
  return { ok: Object.values(checks).every(Boolean), tolerance, checks };
}

export function gateReasons(
  cand: Aggregate,
  base: Aggregate,
  tolerance: number = DEFAULT_TOLERANCE,
  dims: MetricKey[] = GATE_DIMS,
  prefix = '',
): string[] {
  const reasons: string[] = [];
  for (const key of dims) {
    const c = cand[key]?.median;
    const b = base[key]?.median;
    if (c === null || c === undefined || b === null || b === undefined) {
      reasons.push(`${prefix}${key} 判分缺失(cand=${c}, base=${b})→ 无法裁决,FAIL`);
    } else if (c < b - tolerance) {
      reasons.push(`${prefix}${key} 中位 ${c} < 基线 ${b} − 容差 ${tolerance}`);
    }
  }
  return reasons;
}
