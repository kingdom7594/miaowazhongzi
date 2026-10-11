import { describe, it, expect } from 'vitest';
import {
  activeStage,
  computePipelineCounts,
  countDraftsToday,
  dailyQuotaTarget,
  DEFAULT_DAILY_QUOTA,
} from './shell-data';
import type { ContentTopic } from '@/lib/radar/types';
import type { DraftRecord } from '@/lib/types';

function topic(id: string): ContentTopic {
  return { id, headline: `t-${id}`, platforms: ['xiaohongshu'] };
}

function draft(id: number, status: DraftRecord['status'], images: DraftRecord['images'] = []): DraftRecord {
  return {
    id,
    topicId: 'tp',
    platform: 'xiaohongshu',
    body: 'x',
    status,
    images,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('activeStage (F-06 stepper mapping)', () => {
  it('maps pipeline routes to their stage', () => {
    expect(activeStage('/topic')).toBe(1);
    expect(activeStage('/workbench')).toBe(2);
    expect(activeStage('/visual')).toBe(3);
    expect(activeStage('/review')).toBe(4);
    expect(activeStage('/publish')).toBe(5);
  });

  it('does NOT highlight a stage for cross-cutting views', () => {
    expect(activeStage('/library')).toBe(0);
    expect(activeStage('/settings')).toBe(0);
  });

  it('matches nested paths', () => {
    expect(activeStage('/review/123')).toBe(4);
  });
});

describe('computePipelineCounts', () => {
  it('derives counts from topics and draft status/images', () => {
    const counts = computePipelineCounts(
      [topic('a'), topic('b')],
      [
        draft(1, 'draft', []),
        draft(2, 'in_review', [{ skill: 'baoyu-xhs-images', path: 'p.png' }]),
        draft(3, 'in_review', []),
        draft(4, 'approved', [{ skill: 'baoyu-xhs-images', path: 'p.png' }]),
        draft(5, 'published', [{ skill: 'baoyu-xhs-images', path: 'p.png' }]),
      ],
    );
    expect(counts).toEqual({ topic: 2, produce: 5, visual: 2, review: 2, publish: 1 });
  });
});

describe('countDraftsToday', () => {
  it('counts only drafts created on the local date', () => {
    const now = new Date('2026-10-11T12:00:00');
    const drafts = [
      { ...draft(1, 'draft'), createdAt: new Date('2026-10-11T08:00:00').toISOString() },
      { ...draft(2, 'draft'), createdAt: new Date('2026-10-10T23:00:00').toISOString() },
      { ...draft(3, 'draft'), createdAt: 'not-a-date' },
    ];
    expect(countDraftsToday(drafts, now)).toBe(1);
  });
});

describe('dailyQuotaTarget', () => {
  it('falls back to the default when unset/invalid', () => {
    const prev = process.env.NEXT_PUBLIC_DAILY_QUOTA;
    delete process.env.NEXT_PUBLIC_DAILY_QUOTA;
    expect(dailyQuotaTarget()).toBe(DEFAULT_DAILY_QUOTA);
    process.env.NEXT_PUBLIC_DAILY_QUOTA = '-3';
    expect(dailyQuotaTarget()).toBe(DEFAULT_DAILY_QUOTA);
    process.env.NEXT_PUBLIC_DAILY_QUOTA = '12.9';
    expect(dailyQuotaTarget()).toBe(12);
    if (prev === undefined) delete process.env.NEXT_PUBLIC_DAILY_QUOTA;
    else process.env.NEXT_PUBLIC_DAILY_QUOTA = prev;
  });
});
