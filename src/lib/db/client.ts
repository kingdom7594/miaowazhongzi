import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runMigrations } from './migrations';

const globalForDb = globalThis as unknown as { __contentFactoryDb?: DatabaseSync };

export function defaultDbPath(): string {
  return process.env.DB_PATH ?? resolve(process.cwd(), 'data/content-factory.db');
}

export function createDb(path: string = defaultDbPath()): DatabaseSync {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  runMigrations(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__contentFactoryDb) {
    globalForDb.__contentFactoryDb = createDb();
  }
  return globalForDb.__contentFactoryDb;
}
