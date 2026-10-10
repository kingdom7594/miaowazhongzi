import { METRIC_KEYS, RUBRIC_DIMS, type MetricKey, type RubricScores } from './rubric';

/**
 * 统计口径逐条移植 radar `scripts/eval_opportunities.py`:
 *  - 每个 judge run 先聚合成 run 级指标,再跨 run 统计(才是「判分级方差」,E1)。
 *  - 缺失维按缺失剔除,不置 0。
 */

export interface Stat {
  mean: number | null;
  std: number;
  median: number | null;
  n: number;
}

/** 单次 judge 对一个批次产出的分数(run 级样本单位)。 */
export interface JudgeRun {
  by: string;
  temperature: number;
  items: RubricScores[];
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** 规整到 1–5 整数;非法/缺失返回 null。 */
export function toScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return n;
}

function vals(xs: (number | null)[]): number[] {
  return xs.filter((x): x is number => x !== null);
}

export function mean(xs: (number | null)[]): number | null {
  const v = vals(xs);
  return v.length ? round3(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

export function std(xs: (number | null)[]): number {
  const v = vals(xs);
  if (v.length <= 1) return 0;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const variance = v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length;
  return round3(Math.sqrt(variance));
}

export function median(xs: (number | null)[]): number | null {
  const v = vals(xs).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? round3(v[mid]) : round3((v[mid - 1] + v[mid]) / 2);
}

export function computeStat(xs: (number | null)[]): Stat {
  return { mean: mean(xs), std: std(xs), median: median(xs), n: vals(xs).length };
}

/** 把一个 judge run 聚合成 run 级指标。 */
export function runMetric(run: JudgeRun): Record<MetricKey, number | null> {
  const allDims = run.items.flatMap((it) => RUBRIC_DIMS.map((d) => it[d]));
  const out = { total: mean(allDims) } as Record<MetricKey, number | null>;
  for (const dim of RUBRIC_DIMS) {
    out[dim] = mean(run.items.map((it) => it[dim]));
  }
  return out;
}

/** 跨 run 聚合:每个指标的样本单位是 run。 */
export function aggregate(runs: JudgeRun[]): Record<MetricKey, Stat> {
  const acc: Record<MetricKey, (number | null)[]> = {} as Record<MetricKey, (number | null)[]>;
  for (const key of METRIC_KEYS) acc[key] = [];
  for (const run of runs) {
    const metric = runMetric(run);
    for (const key of METRIC_KEYS) acc[key].push(metric[key]);
  }
  const out = {} as Record<MetricKey, Stat>;
  for (const key of METRIC_KEYS) out[key] = computeStat(acc[key]);
  return out;
}

export function formatStat(st: Stat): string {
  return `${st.mean}(±${st.std}, med ${st.median})`;
}
