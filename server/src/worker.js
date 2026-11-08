import { config } from './config.js';
import { createPool } from './db.js';
import { queueConnection, reminderQueue, reminderWorker } from './reminders.js';

const pool = createPool();
const connection = queueConnection(config.redisUrl);
const queue = reminderQueue(connection);
await queue.upsertJobScheduler(
  'daily-check-in',
  { pattern: config.reminderCron, tz: config.timeZone },
  {
    name: 'daily-reminders',
    data: {},
  },
);
const worker = reminderWorker(pool, connection, config.timeZone);
await worker.waitUntilReady();
console.log(`Reminder worker ready. Schedule: ${config.reminderCron} (${config.timeZone}).`);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await worker.close();
    await queue.close();
    await connection.quit();
    await pool.end();
    process.exit(0);
  });
}
