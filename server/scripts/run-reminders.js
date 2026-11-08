import { QueueEvents } from 'bullmq';
import { config } from '../src/config.js';
import { queueConnection, reminderQueue, REMINDER_QUEUE } from '../src/reminders.js';

const connection = queueConnection(config.redisUrl);
const queue = reminderQueue(connection);
const events = new QueueEvents(REMINDER_QUEUE, { connection });
try {
  await events.waitUntilReady();
  const job = await queue.add('daily-reminders', {});
  console.log(await job.waitUntilFinished(events, 30000));
} finally {
  await events.close();
  await queue.close();
  await connection.quit();
}
