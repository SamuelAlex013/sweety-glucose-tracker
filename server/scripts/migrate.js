import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createPool } from '../src/db.js';

export async function migrate(pool) {
  const sql = await readFile(new URL('../db/001_initial.sql', import.meta.url), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('sweety:migrations'))");
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const applied = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [
      '001',
    ]);
    if (!applied.rowCount) {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', ['001']);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pool = createPool();
  try {
    await migrate(pool);
    console.log('Database migrations applied.');
  } finally {
    await pool.end();
  }
}
