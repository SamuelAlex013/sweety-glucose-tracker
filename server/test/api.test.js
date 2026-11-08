import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createPool } from '../src/db.js';
import { createApp } from '../src/app.js';
import { migrate } from '../scripts/migrate.js';

if (!process.env.TEST_DATABASE_URL)
  throw new Error('Set TEST_DATABASE_URL to run the PostgreSQL integration suite.');
const schema = `test_${randomUUID().replaceAll('-', '')}`;
const admin = createPool(process.env.TEST_DATABASE_URL);
let pool, app;
before(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  pool = createPool(process.env.TEST_DATABASE_URL, { options: `-c search_path=${schema}` });
  await migrate(pool);
  await migrate(pool);
  app = createApp(pool, { getToday: () => '2026-10-15', production: false });
});
after(async () => {
  if (pool) await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await admin.end();
});

async function account() {
  const agent = request.agent(app);
  const email = `${randomUUID()}@example.com`;
  const response = await agent
    .post('/api/auth/register')
    .send({ name: 'Test Patient', email, password: 'test-password-42' })
    .expect(201);
  return { agent, email, user: response.body.user };
}
const reading = (date = '2026-10-15', slot = 'morning', value = 100) => ({ date, slot, value });

test('registration hashes passwords, normalizes email, authenticates, expires, and revokes sessions', async () => {
  const { agent, email, user } = await account();
  const stored = (await pool.query('SELECT password_hash FROM users WHERE id = $1', [user.id]))
    .rows[0];
  assert.notEqual(stored.password_hash, 'test-password-42');
  assert.ok(await bcrypt.compare('test-password-42', stored.password_hash));
  await agent.get('/api/auth/me').expect(200);
  await agent.post('/api/auth/logout').send({}).expect(204);
  await agent.get('/api/auth/me').expect(401);
  await agent.post('/api/auth/login').send({ email, password: 'wrong' }).expect(401);
  const login = await agent
    .post('/api/auth/login')
    .send({ email: email.toUpperCase(), password: 'test-password-42' })
    .expect(200);
  assert.match(login.headers['set-cookie'][0], /HttpOnly/);
  assert.match(login.headers['set-cookie'][0], /SameSite=Strict/);
  await pool.query(
    "UPDATE sessions SET expires_at = now() - interval '1 second' WHERE user_id = $1",
    [user.id],
  );
  await agent.get('/api/auth/me').expect(401);
  await request(app)
    .post('/api/auth/register')
    .send({ name: '', email: 'bad', password: 'short' })
    .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Other', email, password: 'test-password-42' })
    .expect(409);
});

test('all reading and report routes require authentication; cross-origin writes are rejected', async () => {
  await request(app).get('/api/readings').expect(401);
  await request(app).post('/api/readings').send(reading()).expect(401);
  await request(app).get('/api/reports').expect(401);
  await request(app)
    .post('/api/auth/login')
    .set('Origin', 'https://other.example')
    .send({})
    .expect(403);
  await request(app)
    .post('/api/auth/login')
    .set('Sec-Fetch-Site', 'cross-site')
    .send({})
    .expect(403);
  await request(app).post('/api/auth/login').type('form').send({ email: 'x' }).expect(415);
});

test('reading CRUD is private, and report aggregates change after edits and deletion', async () => {
  const { agent } = await account();
  const { agent: other } = await account();
  const created = await agent.post('/api/readings').send(reading()).expect(201);
  const id = created.body.reading.id;
  await other.put(`/api/readings/${id}`).send(reading()).expect(404);
  await other.delete(`/api/readings/${id}`).expect(404);
  assert.deepEqual((await other.get('/api/readings').expect(200)).body.readings, []);
  assert.equal(
    (await other.get('/api/reports?date=2026-10-15').expect(200)).body.reports.daily.count,
    0,
  );
  await agent
    .put(`/api/readings/${id}`)
    .send(reading('2026-10-14', 'dinner', 140))
    .expect(200);
  const reports = (await agent.get('/api/reports?date=2026-10-15').expect(200)).body.reports;
  assert.equal(reports.daily.count, 0);
  assert.equal(reports.mtd.average, 140);
  await agent.delete(`/api/readings/${id}`).expect(204);
  assert.equal((await agent.get('/api/reports?date=2026-10-15')).body.reports.mtd.count, 0);
});

test('invalid values, invalid dates, duplicate slots, and the daily maximum have clear errors', async () => {
  const { agent } = await account();
  for (const value of ['', 39, 601, 100.5, true, '1e2']) {
    const result = await agent
      .post('/api/readings')
      .send(reading('2026-10-15', 'morning', value))
      .expect(400);
    assert.ok(result.body.fields.value);
  }
  for (const date of ['2026-10-16', '2026-02-30', 'not-a-date'])
    await agent.post('/api/readings').send(reading(date)).expect(400);
  await agent.post('/api/readings').send(reading('2026-10-15', 'snack')).expect(400);
  await agent.post('/api/readings').send(reading()).expect(201);
  const duplicate = await agent.post('/api/readings').send(reading()).expect(409);
  assert.match(duplicate.body.message, /already have/);
  for (const slot of ['breakfast', 'lunch', 'dinner'])
    await agent.post('/api/readings').send(reading('2026-10-15', slot)).expect(201);
  const fifth = await agent.post('/api/readings').send(reading()).expect(409);
  assert.equal(fifth.body.message, 'You can add only 4 readings per day.');
});

test('concurrent duplicate writes cannot create a fifth or duplicate slot', async () => {
  const { agent } = await account();
  const responses = await Promise.all(
    Array.from({ length: 6 }, () => agent.post('/api/readings').send(reading())),
  );
  assert.equal(responses.filter((response) => response.status === 201).length, 1);
  assert.equal(responses.filter((response) => response.status === 409).length, 5);
  assert.equal((await agent.get('/api/readings')).body.readings.length, 1);
});

test('report ranges exclude future-month and older readings and round averages to one decimal', async () => {
  const { agent } = await account();
  for (const [date, slot, value] of [
    ['2026-08-31', 'morning', 600],
    ['2026-09-01', 'morning', 90],
    ['2026-09-30', 'dinner', 120],
    ['2026-10-01', 'morning', 40],
    ['2026-10-14', 'morning', 600],
    ['2026-10-15', 'morning', 100],
    ['2026-10-15', 'breakfast', 101],
    ['2026-10-15', 'lunch', 103],
  ])
    await agent
      .post('/api/readings')
      .send(reading(date, slot, value))
      .expect(201);
  const { daily, mtd, monthly } = (await agent.get('/api/reports?date=2026-10-15').expect(200)).body
    .reports;
  assert.deepEqual([daily.count, daily.lowest, daily.highest, daily.average], [3, 100, 103, 101.3]);
  assert.equal(daily.readings.length, 3);
  assert.deepEqual([mtd.count, mtd.lowest, mtd.highest, mtd.average], [5, 40, 600, 188.8]);
  assert.deepEqual(
    [monthly.start, monthly.end, monthly.count, monthly.average],
    ['2026-09-01', '2026-09-30', 2, 105],
  );
  const earlier = (await agent.get('/api/reports?date=2026-10-14').expect(200)).body.reports;
  assert.deepEqual([earlier.daily.count, earlier.daily.average], [1, 600]);
  assert.deepEqual([earlier.mtd.count, earlier.mtd.average], [2, 320]);
  const empty = (await agent.get('/api/reports?date=2026-01-01')).body.reports.daily;
  assert.deepEqual(
    [empty.count, empty.average, empty.lowest, empty.highest, empty.readings],
    [0, null, null, null, []],
  );
  await agent.get('/api/reports?date=2026-10-16').expect(400);
});

test('moving a reading to an occupied slot fails without changing either reading', async () => {
  const { agent } = await account();
  await agent.post('/api/readings').send(reading('2026-10-14', 'dinner')).expect(201);
  const created = await agent.post('/api/readings').send(reading()).expect(201);
  await agent
    .put(`/api/readings/${created.body.reading.id}`)
    .send(reading('2026-10-14', 'dinner'))
    .expect(409);
  assert.equal((await agent.get('/api/readings?date=2026-10-15')).body.readings.length, 1);
});

test('PostgreSQL itself enforces valid slots, values, and unique slots', async () => {
  const { user, agent } = await account();
  await agent.post('/api/readings').send(reading()).expect(201);
  const insert = (slot, value) =>
    pool.query('INSERT INTO readings(id,user_id,date,slot,value) VALUES ($1,$2,$3,$4,$5)', [
      randomUUID(),
      user.id,
      '2026-10-15',
      slot,
      value,
    ]);
  await assert.rejects(insert('morning', 100), { code: '23505' });
  await assert.rejects(insert('snack', 100), { code: '23514' });
  await assert.rejects(insert('lunch', 601), { code: '23514' });
});

test('losing an idle database connection does not crash the API process', async () => {
  // Use a child process so an unhandled pool error fails this regression test instead of the suite.
  const script = `
    import assert from 'node:assert/strict';
    import { createPool } from ${JSON.stringify(new URL('../src/db.js', import.meta.url).href)};
    const victim = createPool(process.env.TEST_DATABASE_URL, { max: 1, idleTimeoutMillis: 0 });
    const controller = createPool(process.env.TEST_DATABASE_URL, { max: 1 });
    try {
      const result = await victim.query('SELECT pg_backend_pid() AS pid');
      const removed = new Promise(resolve => victim.once('remove', resolve));
      await controller.query('SELECT pg_terminate_backend($1)', [result.rows[0].pid]);
      await removed;
      assert.equal((await victim.query('SELECT 1 AS value')).rows[0].value, 1);
    } finally {
      await victim.end();
      await controller.end();
    }
  `;
  await promisify(execFile)(process.execPath, ['--input-type=module', '--eval', script], {
    env: process.env,
    timeout: 10000,
  });
});

test('reading pagination returns stable pages, totals, filters, and clear parameter errors', async () => {
  const { agent } = await account();
  for (let index = 0; index < 23; index++) {
    await agent
      .post('/api/readings')
      .send(
        reading(
          `2026-10-0${Math.floor(index / 4) + 1}`,
          ['morning', 'breakfast', 'lunch', 'dinner'][index % 4],
          100 + index,
        ),
      )
      .expect(201);
  }
  const first = (await agent.get('/api/readings?page=1&limit=20').expect(200)).body;
  const second = (await agent.get('/api/readings?page=2&limit=20').expect(200)).body;
  assert.deepEqual(first.pagination, { page: 1, limit: 20, total: 23, totalPages: 2 });
  assert.equal(first.readings.length, 20);
  assert.equal(second.readings.length, 3);
  assert.equal(new Set([...first.readings, ...second.readings].map((row) => row.id)).size, 23);
  assert.deepEqual((await agent.get('/api/readings?page=99&limit=20')).body.readings, []);
  assert.equal((await agent.get('/api/readings?date=2026-10-01&limit=2')).body.pagination.total, 4);
  for (const query of ['page=0', 'page=-1', 'page=1.2', 'limit=101', 'limit=0', 'page=1&page=2'])
    await agent.get(`/api/readings?${query}`).expect(400);
});

test('doctor reports require a patient assignment and preserve patient ownership', async () => {
  const patient = await account();
  const other = await account();
  const doctor = await account();
  await pool.query("UPDATE users SET role='doctor' WHERE id=$1", [doctor.user.id]);
  await pool.query('INSERT INTO doctor_patients(doctor_id,patient_id) VALUES ($1,$2)', [
    doctor.user.id,
    patient.user.id,
  ]);
  const created = await patient.agent.post('/api/readings').send(reading()).expect(201);
  const patients = (await doctor.agent.get('/api/patients').expect(200)).body.patients;
  assert.deepEqual(
    patients.map((row) => row.id),
    [patient.user.id],
  );
  assert.equal(
    (
      await doctor.agent
        .get(`/api/reports?date=2026-10-15&patientId=${patient.user.id}`)
        .expect(200)
    ).body.reports.daily.count,
    1,
  );
  await doctor.agent.get(`/api/reports?patientId=${other.user.id}`).expect(403);
  await patient.agent.get(`/api/reports?patientId=${other.user.id}`).expect(403);
  await patient.agent.get('/api/patients').expect(403);
  await doctor.agent.post('/api/readings').send(reading()).expect(403);
  await doctor.agent.put(`/api/readings/${created.body.reading.id}`).send(reading()).expect(403);
  await doctor.agent.delete(`/api/readings/${created.body.reading.id}`).expect(403);
  await pool.query('DELETE FROM doctor_patients WHERE doctor_id=$1', [doctor.user.id]);
  await doctor.agent.get(`/api/reports?patientId=${patient.user.id}`).expect(403);
});

test('public registration creates a patient even when a role is supplied', async () => {
  const result = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Patient',
      email: `${randomUUID()}@example.com`,
      password: 'test-password-42',
      role: 'doctor',
    })
    .expect(201);
  assert.equal(result.body.user.role, 'patient');
});
