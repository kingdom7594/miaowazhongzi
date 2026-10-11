import { describe, it, expect } from 'vitest';
import { createDb } from './client';
import { insertDraft, getDraft, updateDraftImages, updateDraftContent, updateDraftStatus } from './drafts';
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

describe('drafts repository — 审核处置 (B1)', () => {
  function seed() {
    const db = createDb(':memory:');
    upsertBriefTopics(brief, db);
    const id = insertDraft(
      { topicId: 't-2026-10-11-01', platform: 'xiaohongshu', body: '正文', titles: ['原标题'] },
      'draft',
      db,
    );
    return { db, id };
  }

  it('updateDraftContent 就地更新正文与标题备选', () => {
    const { db, id } = seed();
    const ok = updateDraftContent(id, { body: '改后正文', titles: ['新标题', '原标题'] }, db);
    expect(ok).toBe(true);
    const record = getDraft(id, db);
    expect(record?.body).toBe('改后正文');
    expect(record?.titles).toEqual(['新标题', '原标题']);
  });

  it('updateDraftContent 空补丁返回 false', () => {
    const { db, id } = seed();
    expect(updateDraftContent(id, {}, db)).toBe(false);
  });

  it('updateDraftStatus 写回状态', () => {
    const { db, id } = seed();
    expect(updateDraftStatus(id, 'approved', db)).toBe(true);
    expect(getDraft(id, db)?.status).toBe('approved');
    expect(updateDraftStatus(999, 'approved', db)).toBe(false);
  });
});
