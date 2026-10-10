import type { DatabaseSync } from 'node:sqlite';
import { getDb } from './client';
import type { ContentBrief, ContentTopic } from '@/lib/radar/types';

export interface TopicRecord extends ContentTopic {
  briefDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface IngestResult {
  inserted: number;
  updated: number;
  total: number;
  topicIds: string[];
}

interface TopicRow {
  id: string;
  brief_date: string;
  headline: string;
  angle: string | null;
  audience: string | null;
  hook: string | null;
  core_points_json: string;
  evidence_json: string;
  tags_json: string;
  platforms_json: string;
  source_ref: string | null;
  compliance_json: string | null;
  created_at: string;
  updated_at: string;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toRecord(row: TopicRow): TopicRecord {
  return {
    id: row.id,
    briefDate: row.brief_date,
    headline: row.headline,
    angle: row.angle ?? undefined,
    audience: row.audience ?? undefined,
    hook: row.hook ?? undefined,
    corePoints: parseJson(row.core_points_json, [] as string[]),
    evidence: parseJson(row.evidence_json, [] as ContentTopic['evidence']),
    tags: parseJson(row.tags_json, [] as string[]),
    platforms: parseJson(row.platforms_json, [] as ContentTopic['platforms']),
    sourceRef: row.source_ref ?? undefined,
    compliance: parseJson(row.compliance_json, undefined as ContentTopic['compliance']),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Upsert a content brief's topics. Dedup key = topic.id; provenance is preserved
 * via sourceRef / evidence[].url. Existing rows are updated, new rows inserted.
 */
export function upsertBriefTopics(brief: ContentBrief, db: DatabaseSync = getDb()): IngestResult {
  const exists = db.prepare('SELECT 1 FROM topics WHERE id = ?');
  const insert = db.prepare(
    `INSERT INTO topics (id, brief_date, headline, angle, audience, hook,
       core_points_json, evidence_json, tags_json, platforms_json,
       source_ref, compliance_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const update = db.prepare(
    `UPDATE topics SET brief_date = ?, headline = ?, angle = ?, audience = ?, hook = ?,
       core_points_json = ?, evidence_json = ?, tags_json = ?, platforms_json = ?,
       source_ref = ?, compliance_json = ?, updated_at = ?
     WHERE id = ?`,
  );

  const now = new Date().toISOString();
  let inserted = 0;
  let updated = 0;
  const topicIds: string[] = [];

  db.exec('BEGIN');
  try {
    for (const topic of brief.topics ?? []) {
      if (!topic.id || !topic.headline) {
        throw new Error('Invalid topic: id and headline are required');
      }
      const corePoints = JSON.stringify(topic.corePoints ?? []);
      const evidence = JSON.stringify(topic.evidence ?? []);
      const tags = JSON.stringify(topic.tags ?? []);
      const platforms = JSON.stringify(topic.platforms ?? []);
      const compliance = topic.compliance ? JSON.stringify(topic.compliance) : null;
      const sourceRef = topic.sourceRef ?? null;

      if (exists.get(topic.id)) {
        update.run(
          brief.date, topic.headline, topic.angle ?? null, topic.audience ?? null, topic.hook ?? null,
          corePoints, evidence, tags, platforms, sourceRef, compliance, now, topic.id,
        );
        updated += 1;
      } else {
        insert.run(
          topic.id, brief.date, topic.headline, topic.angle ?? null, topic.audience ?? null, topic.hook ?? null,
          corePoints, evidence, tags, platforms, sourceRef, compliance, now, now,
        );
        inserted += 1;
      }
      topicIds.push(topic.id);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { inserted, updated, total: topicIds.length, topicIds };
}

export function listTopics(db: DatabaseSync = getDb(), limit = 200): TopicRecord[] {
  const rows = db
    .prepare('SELECT * FROM topics ORDER BY brief_date DESC, id ASC LIMIT ?')
    .all(limit) as unknown as TopicRow[];
  return rows.map(toRecord);
}

export function getTopic(id: string, db: DatabaseSync = getDb()): TopicRecord | null {
  const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as unknown as TopicRow | undefined;
  return row ? toRecord(row) : null;
}
