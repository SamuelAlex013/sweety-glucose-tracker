import pg from 'pg';
import { config } from './config.js';

export function createPool(connectionString = config.databaseUrl, options = {}) {
  if (!connectionString) throw new Error('Set DATABASE_URL in the root .env file.');
  return new pg.Pool({ connectionString, max: 10, ...options });
}
