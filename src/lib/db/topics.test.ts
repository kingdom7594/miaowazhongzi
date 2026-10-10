import { describe, it, expect } from 'vitest';
import { createDb } from './client';
import { upsertBriefTopics, listTopics, getTopic } from './topics';
import { runMigrations, MIGRATIONS } from './migrations';
import type { ContentBrief } from '@/lib/radar/types';

const brief: ContentBrief = {
  date: '2026-10-10',
  audience: 'AI工具/效率',
  topics: [
    {
      id: 't-2026-10-10-01',
      headline: '测试选题一',
      hook: '钩子',
      corePoints: ['要点A'],
      evidence: [{ claim: '证据A', source: 'trustmrr', url: 'https://example.com/a' }],
      platforms: ['xiaohongshu'],
      sourceRef: 'opport-1',
      tags: ['AI'],
    },
    {
      id: 't-2026-10-10-02',
      headline: '测试选题二',
      platforms: ['xiaohongshu', 'douyin'],
    },
  ],
};

describe('topics repository', () => {
  it('inserts a brief and dedups on re-ingest (upsert by topic id)', () => {
    const db = createDb(':memory:');
    const first = upsertBriefTopics(brief, db);
    expect(first.inserted).toBe(2);
    expect(first.updated).toBe(0);

    const updatedBrief: ContentBrief = {
      ...brief,
      topics: [{ ...brief.topics[0], headline: '测试选题一(改)' }, brief.topics[1]],
    };
    const second = upsertBriefTopics(updatedBrief, db);
    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(2);

    expect(listTopics(db).length).toBe(2);
    expect(getTopic('t-2026-10-10-01', db)?.headline).toBe('测试选题一(改)');
  });

  it('preserves provenance (sourceRef + evidence url)', () => {
    const db = createDb(':memory:');
    upsertBriefTopics(brief, db);
    const topic = getTopic('t-2026-10-10-01', db);
    expect(topic?.sourceRef).toBe('opport-1');
    expect(topic?.evidence?.[0]?.url).toBe('https://example.com/a');
    expect(topic?.corePoints).toEqual(['要点A']);
  });

  it('runs migrations idempotently when run twice on the same db', () => {
    const db = createDb(':memory:');
    const appliedCount = () =>
      (db.prepare('SELECT COUNT(*) AS n FROM _migrations').get() as { n: number }).n;

    expect(appliedCount()).toBe(MIGRATIONS.length);

    // Second explicit run on the SAME db must be a no-op (no re-apply, no throw).
    expect(() => runMigrations(db)).not.toThrow();
    expect(appliedCount()).toBe(MIGRATIONS.length);

    // Data still works afterwards.
    const second = upsertBriefTopics(brief, db);
    expect(second.total).toBe(2);
    expect(listTopics(db).length).toBe(2);
  });
});
