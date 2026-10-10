/** L5 内容质量 rubric(1–5 整数分/维),移植雷达 eval_opportunities.py 的 judge 思路。 */
export const RUBRIC_DIMS = [
  'hook',
  'audienceFit',
  'evidence',
  'platformFit',
  'originality',
] as const;

export type RubricDim = (typeof RUBRIC_DIMS)[number];

export interface RubricScores {
  hook: number | null;
  audienceFit: number | null;
  evidence: number | null;
  platformFit: number | null;
  originality: number | null;
}

export interface ScoredDraft {
  dims: RubricScores;
  by: string;
}

/** 统计指标键:总分 + 各维。 */
export const METRIC_KEYS = ['total', ...RUBRIC_DIMS] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

/** 非劣门考察的指标(默认覆盖总分与全部维度)。 */
export const GATE_DIMS: MetricKey[] = ['total', ...RUBRIC_DIMS];

export const DEFAULT_TOLERANCE = 0.5;

export const RUBRIC_LABELS: Record<MetricKey, string> = {
  total: '总分',
  hook: '钩子强度',
  audienceFit: '受众契合',
  evidence: '依据支撑',
  platformFit: '平台规范',
  originality: '原创性',
};
