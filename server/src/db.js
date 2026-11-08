import pg from 'pg';
import { config } from './config.js';

export function createPool(connectionString = config.databaseUrl, options = {}) {
  if (!connectionString) throw new Error('Set DATABASE_URL in the root .env file.');
  const pool = new pg.Pool({ connectionString, max: 10, ...options });
  // pg removes the failed idle client; handle its event so later requests can reconnect.
  pool.on('error', (error) => {
    console.error('Idle PostgreSQL connection closed:', { code: error.code || error.name });
  });
  return pool;
}
