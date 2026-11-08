import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { createPool } from '../src/db.js';

const { values } = parseArgs({
  options: { name: { type: 'string' }, email: { type: 'string' }, patient: { type: 'string' } },
});
const pool = createPool();
const client = await pool.connect();
try {
  if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    throw new Error('Provide --email for the doctor account.');
  const email = values.email.trim().toLowerCase();
  await client.query('BEGIN');
  let doctor = (
    await client.query("SELECT id FROM users WHERE email = $1 AND role = 'doctor'", [email])
  ).rows[0];
  if (!doctor) {
    const password = process.env.DOCTOR_PASSWORD || '';
    if (
      !values.name?.trim() ||
      values.name.trim().length > 80 ||
      password.length < 8 ||
      Buffer.byteLength(password) > 72
    ) {
      throw new Error(
        'Provide --name and DOCTOR_PASSWORD (8 characters minimum, 72 UTF-8 bytes maximum).',
      );
    }
    doctor = (
      await client.query(
        "INSERT INTO users(id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,'doctor') RETURNING id",
        [randomUUID(), values.name.trim(), email, await bcrypt.hash(password, 12)],
      )
    ).rows[0];
  }
  if (values.patient) {
    const patient = (
      await client.query("SELECT id FROM users WHERE email = $1 AND role = 'patient'", [
        values.patient.trim().toLowerCase(),
      ])
    ).rows[0];
    if (!patient) throw new Error('Provide an existing patient email with --patient.');
    await client.query(
      'INSERT INTO doctor_patients(doctor_id,patient_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [doctor.id, patient.id],
    );
  }
  await client.query('COMMIT');
  console.log(
    `Doctor account ready: ${email}${values.patient ? `; patient assigned: ${values.patient}` : ''}.`,
  );
} catch (error) {
  await client.query('ROLLBACK');
  console.error(
    error.code === '23505' ? 'This email already belongs to another account.' : error.message,
  );
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
