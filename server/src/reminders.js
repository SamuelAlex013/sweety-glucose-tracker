import { Router } from 'express';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { todayIn } from '../../shared/domain.js';
import { requirePatient } from './patients.js';

export const REMINDER_QUEUE = 'sweety-reminders';

export function queueConnection(url) {
  if (!url) throw new Error('Set REDIS_URL to run reminder jobs.');
  const connection = new Redis(url, { maxRetriesPerRequest: null });
  connection.on('error', (error) =>
    console.error('Reminder connection:', { code: error.code || error.name }),
  );
  return connection;
}

export function reminderQueue(connection, options = {}) {
  return new Queue(REMINDER_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
    ...options,
  });
}

export async function runReminderSweep(pool, date) {
  const result = await pool.query(
    `INSERT INTO reminder_logs(user_id, date, reading_count)
    SELECT u.id, $1::date, count(r.id)::smallint FROM users u
    LEFT JOIN readings r ON r.user_id = u.id AND r.date = $1::date
    WHERE u.role = 'patient' GROUP BY u.id HAVING count(r.id) < 4
    ON CONFLICT(user_id, date) DO NOTHING RETURNING user_id, to_char(date, 'YYYY-MM-DD') AS date, reading_count`,
    [date],
  );
  for (const reminder of result.rows) console.log('Daily reading reminder:', reminder);
  return { date, remindersCreated: result.rowCount };
}

export function reminderWorker(pool, connection, timeZone, options = {}) {
  const worker = new Worker(REMINDER_QUEUE, () => runReminderSweep(pool, todayIn(timeZone)), {
    connection,
    concurrency: 1,
    ...options,
  });
  worker.on('error', (error) =>
    console.error('Reminder worker:', { code: error.code || error.name }),
  );
  worker.on('failed', (job, error) =>
    console.error('Reminder job failed:', { jobId: job?.id, code: error.code || error.name }),
  );
  return worker;
}

export function remindersRouter(pool) {
  const router = Router();
  router.get('/', requirePatient, async (req, res) => {
    const result = await pool.query(
      `SELECT id, to_char(date, 'YYYY-MM-DD') AS date, reading_count, created_at
      FROM reminder_logs WHERE user_id = $1 ORDER BY date DESC LIMIT 30`,
      [req.user.id],
    );
    res.json({ reminders: result.rows });
  });
  return router;
}
