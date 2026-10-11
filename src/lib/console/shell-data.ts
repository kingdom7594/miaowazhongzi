import type { ContentTopic } from '@/lib/radar/types';
import type { DraftRecord } from '@/lib/types';

/** 流水线阶段标签(与顶栏 Stepper 顺序一致)。 */
export const PIPELINE_STAGES = ['选题', '生成', '视觉', '审核', '发布'] as const;

/**
 * 路由 → 流水线阶段(1..5)。
 * 稿件库 / 设置是跨阶段视图,不属于单一阶段 → 0(Stepper 不高亮任何阶段)。
 * F-06:修复此前 `/library`(stage 5)错误高亮「发布」的问题。
 */
export function activeStage(pathname: string): number {
  if (pathname.startsWith('/topic')) return 1;
  if (pathname.startsWith('/workbench')) return 2;
  if (pathname.startsWith('/visual')) return 3;
  if (pathname.startsWith('/review')) return 4;
  if (pathname.startsWith('/publish')) return 5;
  return 0;
}

export interface PipelineCounts {
  topic: number;
  produce: number;
  visual: number;
  review: number;
  publish: number;
}

/** 各阶段待办计数,全部来自真实数据(选题 / draft 状态与产物)。 */
export function computePipelineCounts(
  topics: ContentTopic[],
  drafts: DraftRecord[],
): PipelineCounts {
  return {
    topic: topics.length,
    produce: drafts.length,
    visual: drafts.filter((d) => (d.images ?? []).length === 0).length,
    review: drafts.filter((d) => d.status === 'in_review').length,
    publish: drafts.filter((d) => d.status === 'approved').length,
  };
}

/** 侧栏「今日产出」:本地日期当天创建的 draft 数(真实用量,非伪造)。 */
export function countDraftsToday(drafts: DraftRecord[], now: Date = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = now.getDate();
  return drafts.filter((d) => {
    const t = new Date(d.createdAt);
    if (Number.isNaN(t.getTime())) return false;
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === day;
  }).length;
}

export const DEFAULT_DAILY_QUOTA = 50;

/**
 * 今日产出目标(额度分母)。来自 `NEXT_PUBLIC_DAILY_QUOTA`,缺省 50 —— 这是可配的「目标」,
 * 用量侧 countDraftsToday 才是真实产出,两者相除得进度条。
 */
export function dailyQuotaTarget(): number {
  const raw = process.env.NEXT_PUBLIC_DAILY_QUOTA;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAILY_QUOTA;
}
