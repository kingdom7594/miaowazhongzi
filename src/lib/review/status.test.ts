import { describe, it, expect } from 'vitest';
import {
  canTransitionDraftStatus,
  isDraftStatus,
  DRAFT_STATUSES,
} from './status';

describe('draft 状态机 (B1 审核写回)', () => {
  it('draft 可送审 / 直接放行 / 打回', () => {
    expect(canTransitionDraftStatus('draft', 'in_review')).toBe(true);
    expect(canTransitionDraftStatus('draft', 'approved')).toBe(true);
    expect(canTransitionDraftStatus('draft', 'rejected')).toBe(true);
  });

  it('in_review 仅可放行 / 打回', () => {
    expect(canTransitionDraftStatus('in_review', 'approved')).toBe(true);
    expect(canTransitionDraftStatus('in_review', 'rejected')).toBe(true);
    expect(canTransitionDraftStatus('in_review', 'draft')).toBe(false);
  });

  it('rejected 不可直接放行,需重新送审', () => {
    expect(canTransitionDraftStatus('rejected', 'approved')).toBe(false);
    expect(canTransitionDraftStatus('rejected', 'in_review')).toBe(true);
  });

  it('published 为终态', () => {
    for (const s of DRAFT_STATUSES) {
      expect(canTransitionDraftStatus('published', s)).toBe(s === 'published');
    }
  });

  it('同状态幂等合法;isDraftStatus 收窄非法值', () => {
    for (const s of DRAFT_STATUSES) expect(canTransitionDraftStatus(s, s)).toBe(true);
    expect(isDraftStatus('approved')).toBe(true);
    expect(isDraftStatus('nope')).toBe(false);
    expect(isDraftStatus(3)).toBe(false);
  });
});
