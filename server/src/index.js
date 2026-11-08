import { createPool } from './db.js';
import { createApp } from './app.js';
import { config } from './config.js';

const pool = createPool();
await pool.query('SELECT 1 FROM schema_migrations LIMIT 1');
const server = createApp(pool).listen(config.port, () => console.log(`Sweety API listening on http://localhost:${config.port}`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(async () => { await pool.end(); process.exit(0); }));
}
