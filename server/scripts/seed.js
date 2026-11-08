import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { createPool } from '../src/db.js';
import { config } from '../src/config.js';
import { todayIn, SLOTS, reportRanges } from '../../shared/domain.js';
import { createReportCache } from '../src/cache.js';

const pool = createPool();
const cache = await createReportCache(config.redisUrl);
const client = await pool.connect();
try {
  const email = (process.env.DEMO_EMAIL || 'demo@sweety.local').trim().toLowerCase();
  const password = process.env.DEMO_PASSWORD || 'SweetyDemo2026!';
  const passwordHash = await bcrypt.hash(password, 12);
  await client.query('BEGIN');
  const user = await client.query(
    `INSERT INTO users(id, name, email, password_hash) VALUES ($1, $2, $3, $4)
    ON CONFLICT(email) DO UPDATE SET name = EXCLUDED.name RETURNING id, role`,
    [randomUUID(), 'Samuel Alexander', email, passwordHash],
  );
  if (user.rows[0].role !== 'patient') throw new Error('Choose a patient email for DEMO_EMAIL.');
  const today = todayIn(config.timeZone);
  const doctorEmail = (process.env.DEMO_DOCTOR_EMAIL || 'doctor@sweety.local').trim().toLowerCase();
  const doctorPassword = process.env.DEMO_DOCTOR_PASSWORD || 'SweetyDoctor2026!';
  const doctor = await client.query(
    `INSERT INTO users(id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,'doctor')
    ON CONFLICT(email) DO UPDATE SET name = EXCLUDED.name RETURNING id, role`,
    [randomUUID(), 'Dr. Meera Shah', doctorEmail, await bcrypt.hash(doctorPassword, 12)],
  );
  if (doctor.rows[0].role !== 'doctor')
    throw new Error(
      'The demo doctor email belongs to a patient account. Choose a different DEMO_DOCTOR_EMAIL.',
    );
  await client.query(
    'INSERT INTO doctor_patients(doctor_id,patient_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [doctor.rows[0].id, user.rows[0].id],
  );
  const start = reportRanges(today).monthly.start;
  const cursor = new Date(`${start}T00:00:00Z`);
  let day = 0;
  while (cursor.toISOString().slice(0, 10) <= today) {
    const date = cursor.toISOString().slice(0, 10);
    for (const [index, slot] of SLOTS.entries()) {
      // Two open slots today make the first recording interaction easy to try.
      if (date === today && index > 1) continue;
      const value = [96, 132, 141, 125][index] + ((day * 7 + index * 3) % 23) - 8;
      await client.query(
        'INSERT INTO readings(id, user_id, date, slot, value) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(user_id,date,slot) DO NOTHING',
        [randomUUID(), user.rows[0].id, date, slot.id, value],
      );
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    day++;
  }
  await client.query('UPDATE users SET report_version = report_version + 1 WHERE id = $1', [
    user.rows[0].id,
  ]);
  await client.query('COMMIT');
  await cache.invalidate(user.rows[0].id);
  console.log(`Doctor demo ready: ${doctorEmail}, assigned to Samuel Alexander.`);
  console.log(
    `Synthetic demo readings ready for ${email}. Existing readings and passwords were preserved.`,
  );
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
  await cache.close();
}
