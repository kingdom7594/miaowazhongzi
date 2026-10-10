import type { DatabaseSync } from 'node:sqlite';
import { getDb } from './client';
import type { PublicationRecord } from '@/lib/types';

interface PublicationRow {
  id: number;
  draft_id: number | null;
  platform: string;
  status: string;
  result_json: string | null;
  published_at: string | null;
  created_at: string;
}

export interface NewPublication {
  draftId: number | null;
  platform: string;
  status?: string;
  result?: Record<string, unknown>;
  publishedAt?: string | null;
}

function toRecord(row: PublicationRow): PublicationRecord {
  let result: Record<string, unknown> | undefined;
  if (row.result_json) {
    try {
      result = JSON.parse(row.result_json) as Record<string, unknown>;
    } catch {
      result = undefined;
    }
  }
  return {
    id: row.id,
    draftId: row.draft_id,
    platform: row.platform,
    status: row.status,
    result,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

export function insertPublication(pub: NewPublication, db: DatabaseSync = getDb()): number {
  const result = db
    .prepare(
      `INSERT INTO publications (draft_id, platform, status, result_json, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      pub.draftId,
      pub.platform,
      pub.status ?? 'pending',
      pub.result ? JSON.stringify(pub.result) : null,
      pub.publishedAt ?? null,
      new Date().toISOString(),
    );
  return Number(result.lastInsertRowid);
}

export function listPublications(db: DatabaseSync = getDb(), limit = 200): PublicationRecord[] {
  const rows = db
    .prepare('SELECT * FROM publications ORDER BY created_at DESC, id DESC LIMIT ?')
    .all(limit) as unknown as PublicationRow[];
  return rows.map(toRecord);
}
