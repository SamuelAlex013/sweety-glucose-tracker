import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import Redis from 'ioredis';
import { QueueEvents } from 'bullmq';
import { createPool } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createReportCache } from '../src/cache.js';
import { migrate } from '../scripts/migrate.js';
import { todayIn, SLOTS } from '../../shared/domain.js';
import {
  queueConnection,
  reminderQueue,
  reminderWorker,
  REMINDER_QUEUE,
} from '../src/reminders.js';

if (!process.env.TEST_DATABASE_URL || !process.env.TEST_REDIS_URL)
  throw new Error('Set TEST_DATABASE_URL and TEST_REDIS_URL for infrastructure tests.');
const namespace = `sweety-test-${randomUUID()}`;
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = createPool(process.env.TEST_DATABASE_URL);
let pool, cache, redis, app;
before(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  pool = createPool(process.env.TEST_DATABASE_URL, { options: `-c search_path=${schema}` });
  await migrate(pool);
  cache = await createReportCache(process.env.TEST_REDIS_URL, namespace);
  redis = new Redis(process.env.TEST_REDIS_URL, { maxRetriesPerRequest: 1 });
  app = createApp(pool, { cache, getToday: () => '2026-10-15' });
});
after(async () => {
  if (redis) {
    const keys = await redis.keys(`${namespace}:*`);
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  }
  await cache?.close();
  await pool?.end();
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await admin.end();
});
async function account(role = 'patient') {
  const agent = request.agent(app);
  const user = (
    await agent
      .post('/api/auth/register')
      .send({
        name: role === 'doctor' ? 'Doctor' : 'Patient',
        email: `${randomUUID()}@example.com`,
        password: 'test-password-42',
      })
      .expect(201)
  ).body.user;
  if (role === 'doctor') await pool.query("UPDATE users SET role='doctor' WHERE id=$1", [user.id]);
  return { agent, user };
}
test('Redis reports hit the cache and clear after create, edit, and delete', async () => {
  const { agent, user } = await account();
  const path = '/api/reports?date=2026-10-15';
  assert.equal((await agent.get(path).expect(200)).headers['x-report-cache'], 'MISS');
  assert.equal((await agent.get(path).expect(200)).headers['x-report-cache'], 'HIT');
  const created = (
    await agent
      .post('/api/readings')
      .send({ date: '2026-10-15', slot: 'lunch', value: 120 })
      .expect(201)
  ).body.reading;
  assert.equal((await redis.keys(`${namespace}:${user.id}:*`)).length, 0);
  let report = await agent.get(path).expect(200);
  assert.equal(report.headers['x-report-cache'], 'MISS');
  assert.equal(report.body.reports.daily.average, 120);
  await agent
    .put(`/api/readings/${created.id}`)
    .send({ ...created, value: 150 })
    .expect(200);
  report = await agent.get(path).expect(200);
  assert.equal(report.headers['x-report-cache'], 'MISS');
  assert.equal(report.body.reports.daily.average, 150);
  await agent.delete(`/api/readings/${created.id}`).expect(204);
  assert.equal((await redis.keys(`${namespace}:${user.id}:*`)).length, 0);
  // A late response from an older request can only populate its obsolete version.
  await cache.set(user.id, '0', '2026-10-15', { reports: { daily: { count: 99 } } });
  report = await agent.get(path).expect(200);
  assert.equal(report.headers['x-report-cache'], 'MISS');
  assert.equal(report.body.reports.daily.count, 0);
});
test('cached reports stay behind patient and doctor assignment checks', async () => {
  const patient = await account();
  const other = await account();
  const doctor = await account('doctor');
  await patient.agent.get('/api/reports?date=2026-10-15').expect(200);
  await pool.query('INSERT INTO doctor_patients(doctor_id,patient_id) VALUES ($1,$2)', [
    doctor.user.id,
    patient.user.id,
  ]);
  const path = `/api/reports?date=2026-10-15&patientId=${patient.user.id}`;
  assert.equal((await doctor.agent.get(path).expect(200)).headers['x-report-cache'], 'HIT');
  await other.agent.get(path).expect(403);
  await pool.query('DELETE FROM doctor_patients WHERE doctor_id=$1', [doctor.user.id]);
  await doctor.agent.get(path).expect(403);
});
test('BullMQ schedules and runs daily check-ins once for patients with open slots', async () => {
  const empty = await account();
  const full = await account();
  const partial = await account();
  const doctor = await account('doctor');
  const date = todayIn('UTC');
  for (const [owner, slots] of [
    [full, SLOTS],
    [partial, SLOTS.slice(0, 3)],
  ])
    for (const slot of slots) {
      await pool.query(
        'INSERT INTO readings(id,user_id,date,slot,value) VALUES ($1,$2,$3,$4,100)',
        [randomUUID(), owner.user.id, date, slot.id],
      );
    }
  const connection = queueConnection(process.env.TEST_REDIS_URL);
  const options = { prefix: namespace };
  const queue = reminderQueue(connection, options);
  const events = new QueueEvents(REMINDER_QUEUE, { connection, ...options });
  const worker = reminderWorker(pool, connection, 'UTC', options);
  try {
    await events.waitUntilReady();
    await worker.waitUntilReady();
    await queue.upsertJobScheduler(
      'daily-test',
      { pattern: '0 20 * * *', tz: 'UTC' },
      { name: 'daily-reminders', data: {} },
    );
    assert.equal((await queue.getJobScheduler('daily-test')).pattern, '0 20 * * *');
    const first = await queue.add('daily-reminders', {});
    await first.waitUntilFinished(events, 10000);
    const second = await queue.add('daily-reminders', {});
    assert.equal((await second.waitUntilFinished(events, 10000)).remindersCreated, 0);
    const own = (await empty.agent.get('/api/reminders').expect(200)).body.reminders;
    assert.equal(own.length, 1);
    assert.equal(own[0].reading_count, 0);
    assert.equal((await partial.agent.get('/api/reminders')).body.reminders[0].reading_count, 3);
    assert.equal((await full.agent.get('/api/reminders')).body.reminders.length, 0);
    await doctor.agent.get('/api/reminders').expect(403);
  } finally {
    await worker.close();
    await events.close();
    await queue.obliterate({ force: true });
    await queue.close();
    await connection.quit();
  }
});
