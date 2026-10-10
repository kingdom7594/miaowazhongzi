import { describe, it, expect } from 'vitest';
import { createDb } from './client';
import { insertDraft, getDraft, updateDraftImages } from './drafts';
import { upsertBriefTopics } from './topics';
import type { ContentBrief } from '@/lib/radar/types';

const brief: ContentBrief = {
  date: '2026-10-11',
  audience: 'AI工具/效率',
  topics: [
    {
      id: 't-2026-10-11-01',
      headline: '测试选题',
      platforms: ['xiaohongshu'],
    },
  ],
};

describe('drafts repository — L3 image backfill', () => {
  it('backfills drafts.images and round-trips them', () => {
    const db = createDb(':memory:');
    upsertBriefTopics(brief, db);
    const id = insertDraft(
      { topicId: 't-2026-10-11-01', platform: 'xiaohongshu', body: '正文' },
      'draft',
      db,
    );

    expect(getDraft(id, db)?.images).toEqual([]);

    const ok = updateDraftImages(
      id,
      [{ skill: 'baoyu-cover-image', path: '/srv/renders/cover.png', aspect: '3:4' }],
      db,
    );
    expect(ok).toBe(true);

    const record = getDraft(id, db);
    expect(record?.images).toEqual([
      { skill: 'baoyu-cover-image', path: '/srv/renders/cover.png', aspect: '3:4' },
    ]);
    expect(record?.updatedAt).toBeTruthy();
  });

  it('returns false when updating a missing draft', () => {
    const db = createDb(':memory:');
    expect(updateDraftImages(999, [], db)).toBe(false);
  });
});
