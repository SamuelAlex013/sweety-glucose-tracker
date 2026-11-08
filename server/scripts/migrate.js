import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createPool } from '../src/db.js';

export async function migrate(pool) {
  const directory = new URL('../db/', import.meta.url);
  const files = (await readdir(directory)).filter((file) => /^\d{3}_.+\.sql$/.test(file)).sort();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('sweety:migrations'))");
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const file of files) {
      const version = file.slice(0, 3);
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [
        version,
      ]);
      if (!applied.rowCount) {
        await client.query(await readFile(new URL(file, directory), 'utf8'));
        await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [version]);
      }
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
