import type { DraftStatus } from '@/lib/types';

export type { DraftStatus };

/**
 * draft 审核状态机(B1)。来源:`drafts.status`。
 * - draft → in_review / approved / rejected(审核页可直接放行或打回)
 * - in_review → approved / rejected
 * - approved → published / rejected(可撤回打回)
 * - rejected → in_review / draft(重新送审)
 * - published → 终态
 */
export const DRAFT_STATUS_TRANSITIONS: Record<DraftStatus, DraftStatus[]> = {
  draft: ['in_review', 'approved', 'rejected'],
  in_review: ['approved', 'rejected'],
  approved: ['published', 'rejected'],
  rejected: ['in_review', 'draft'],
  published: [],
};

export const DRAFT_STATUSES: DraftStatus[] = [
  'draft',
  'in_review',
  'approved',
  'rejected',
  'published',
];

export function isDraftStatus(value: unknown): value is DraftStatus {
  return typeof value === 'string' && (DRAFT_STATUSES as string[]).includes(value);
}

/** 同一状态视为幂等合法;其余按状态机判定。 */
export function canTransitionDraftStatus(from: DraftStatus, to: DraftStatus): boolean {
  if (from === to) return true;
  return DRAFT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  draft: '草稿',
  in_review: '审核中',
  approved: '已通过',
  rejected: '已打回',
  published: '已发布',
};
