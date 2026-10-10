import type { DatabaseSync } from 'node:sqlite';
import { getDb } from './client';
import type { Draft, DraftRecord, DraftStatus } from '@/lib/types';

interface DraftRow {
  id: number;
  topic_id: string;
  platform: string;
  titles_json: string;
  body: string;
  tags_json: string;
  cover_prompt: string | null;
  images_json: string;
  compliance_json: string | null;
  scores_json: string | null;
  status: string;
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

function toRecord(row: DraftRow): DraftRecord {
  return {
    id: row.id,
    topicId: row.topic_id,
    platform: row.platform,
    titles: parseJson(row.titles_json, [] as string[]),
    body: row.body,
    tags: parseJson(row.tags_json, [] as string[]),
    coverPrompt: row.cover_prompt ?? undefined,
    images: parseJson(row.images_json, [] as Draft['images']),
    compliance: parseJson(row.compliance_json, undefined as Draft['compliance']),
    scores: parseJson(row.scores_json, undefined as Draft['scores']),
    status: row.status as DraftStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function insertDraft(draft: Draft, status: DraftStatus = 'draft', db: DatabaseSync = getDb()): number {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO drafts (topic_id, platform, titles_json, body, tags_json, cover_prompt,
         images_json, compliance_json, scores_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      draft.topicId,
      draft.platform,
      JSON.stringify(draft.titles ?? []),
      draft.body,
      JSON.stringify(draft.tags ?? []),
      draft.coverPrompt ?? null,
      JSON.stringify(draft.images ?? []),
      draft.compliance ? JSON.stringify(draft.compliance) : null,
      draft.scores ? JSON.stringify(draft.scores) : null,
      status,
      now,
      now,
    );
  return Number(result.lastInsertRowid);
}

export function listDrafts(db: DatabaseSync = getDb(), limit = 200): DraftRecord[] {
  const rows = db
    .prepare('SELECT * FROM drafts ORDER BY created_at DESC, id DESC LIMIT ?')
    .all(limit) as unknown as DraftRow[];
  return rows.map(toRecord);
}

export function getDraft(id: number, db: DatabaseSync = getDb()): DraftRecord | null {
  const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) as unknown as DraftRow | undefined;
  return row ? toRecord(row) : null;
}

export function updateDraftStatus(id: number, status: DraftStatus, db: DatabaseSync = getDb()): boolean {
  const result = db
    .prepare('UPDATE drafts SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, new Date().toISOString(), id);
  return Number(result.changes) > 0;
}

export function countDrafts(db: DatabaseSync = getDb()): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM drafts').get() as { n: number };
  return row.n;
}
