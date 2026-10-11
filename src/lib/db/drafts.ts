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

/** 回填 L5 评估结果(compliance / scores)。 */
export function updateDraftEvaluation(
  id: number,
  evaluation: Pick<Draft, 'compliance' | 'scores'>,
  db: DatabaseSync = getDb(),
): boolean {
  const result = db
    .prepare('UPDATE drafts SET compliance_json = ?, scores_json = ?, updated_at = ? WHERE id = ?')
    .run(
      evaluation.compliance ? JSON.stringify(evaluation.compliance) : null,
      evaluation.scores ? JSON.stringify(evaluation.scores) : null,
      new Date().toISOString(),
      id,
    );
  return Number(result.changes) > 0;
}

/** 回填 L3 出图结果(images)。整表替换本次 draft 的图片引用数组。 */
export function updateDraftImages(id: number, images: Draft['images'], db: DatabaseSync = getDb()): boolean {
  const result = db
    .prepare('UPDATE drafts SET images_json = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(images ?? []), new Date().toISOString(), id);
  return Number(result.changes) > 0;
}

/** 审核页「编辑后通过」:就地更新标题备选 / 正文(只改传入字段)。 */
export function updateDraftContent(
  id: number,
  content: { body?: string; titles?: string[] },
  db: DatabaseSync = getDb(),
): boolean {
  const sets: string[] = [];
  const values: Array<string | number> = [];
  if (typeof content.body === 'string') {
    sets.push('body = ?');
    values.push(content.body);
  }
  if (Array.isArray(content.titles)) {
    sets.push('titles_json = ?');
    values.push(JSON.stringify(content.titles));
  }
  if (sets.length === 0) return false;
  sets.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);
  const result = db.prepare(`UPDATE drafts SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return Number(result.changes) > 0;
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
