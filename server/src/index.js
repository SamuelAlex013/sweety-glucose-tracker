import { createPool } from './db.js';
import { createApp } from './app.js';
import { config } from './config.js';
import { createReportCache } from './cache.js';

const pool = createPool();
await pool.query('SELECT 1 FROM schema_migrations LIMIT 1');
const cache = await createReportCache(config.redisUrl);
const server = createApp(pool, { cache }).listen(config.port, () =>
  console.log(`Sweety API listening on http://localhost:${config.port}`),
);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () =>
    server.close(async () => {
      await pool.end();
      await cache.close();
      process.exit(0);
    }),
  );
}
