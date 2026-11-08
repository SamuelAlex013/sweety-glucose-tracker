import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { createPool } from '../src/db.js';
import { config } from '../src/config.js';
import { todayIn, SLOTS, reportRanges } from '../../shared/domain.js';

const pool = createPool();
const client = await pool.connect();
try {
  const email = process.env.DEMO_EMAIL || 'demo@sweety.local';
  const password = process.env.DEMO_PASSWORD || 'SweetyDemo2026!';
  const passwordHash = await bcrypt.hash(password, 12);
  await client.query('BEGIN');
  const user = await client.query(
    `INSERT INTO users(id, name, email, password_hash) VALUES ($1, $2, $3, $4)
    ON CONFLICT(email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [randomUUID(), 'Alex Morgan', email, passwordHash],
  );
  const today = todayIn(config.timeZone);
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
  await client.query('COMMIT');
  console.log(
    `Synthetic demo readings ready for ${email}. Existing readings and passwords were preserved.`,
  );
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
