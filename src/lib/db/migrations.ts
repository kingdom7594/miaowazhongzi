import type { DatabaseSync } from 'node:sqlite';

export interface Migration {
  id: string;
  sql: string;
}

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  brief_date TEXT NOT NULL,
  headline TEXT NOT NULL,
  angle TEXT,
  audience TEXT,
  hook TEXT,
  core_points_json TEXT NOT NULL DEFAULT '[]',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  platforms_json TEXT NOT NULL DEFAULT '[]',
  source_ref TEXT,
  compliance_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_topics_brief_date ON topics(brief_date);

CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  titles_json TEXT NOT NULL DEFAULT '[]',
  body TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  cover_prompt TEXT,
  images_json TEXT NOT NULL DEFAULT '[]',
  compliance_json TEXT,
  scores_json TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drafts_topic ON drafts(topic_id);
CREATE INDEX IF NOT EXISTS idx_drafts_platform ON drafts(platform);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);

CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  draft_id INTEGER REFERENCES drafts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_json TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_publications_draft ON publications(draft_id);
`;

export const MIGRATIONS: Migration[] = [{ id: '0001_init', sql: INIT_SQL }];

export function runMigrations(db: DatabaseSync): void {
  db.exec(
    'CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  );
  const applied = new Set(
    (db.prepare('SELECT id FROM _migrations').all() as Array<{ id: string }>).map((r) => r.id),
  );
  const insert = db.prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)');

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.exec('BEGIN');
    try {
      db.exec(migration.sql);
      insert.run(migration.id, new Date().toISOString());
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
