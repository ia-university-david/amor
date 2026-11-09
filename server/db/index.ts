import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import { Migrator, type MigrationProvider } from 'kysely/migration';
import type { Database } from './schema';
import { migrations } from './migrations';

export type DB = Kysely<Database>;

/**
 * `sqlite:./data/amor.db`, `sqlite::memory:` or `postgres://user:pass@host/db`.
 * SQLite is the default for a single small server; switch to Postgres by
 * changing DATABASE_URL — queries only use features both support.
 */
export async function createDb(url: string): Promise<DB> {
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    const pg = await import('pg');
    const Pool = pg.default?.Pool ?? pg.Pool;
    return new Kysely<Database>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString: url, max: 10 }) }) });
  }
  const file = url.replace(/^sqlite:/, '') || ':memory:';
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const { default: SQLite } = await import('better-sqlite3');
  const database = new SQLite(file);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');
  return new Kysely<Database>({ dialect: new SqliteDialect({ database }) });
}

const provider: MigrationProvider = {
  async getMigrations() {
    return migrations;
  },
};

export async function migrate(db: DB): Promise<string[]> {
  const migrator = new Migrator({ db, provider });
  const { error, results } = await migrator.migrateToLatest();
  if (error) throw error instanceof Error ? error : new Error(String(error));
  return (results ?? []).filter((r) => r.status === 'Success').map((r) => r.migrationName);
}
