import { Router } from 'express';
import { ApiError } from './errors.js';

export function requirePatient(req, res, next) {
  if (req.user.role !== 'patient')
    throw new ApiError(403, 'Reading changes belong to the patient account.');
  next();
}

export function patientsRouter(pool) {
  const router = Router();
  router.get('/', async (req, res) => {
    if (req.user.role !== 'doctor') throw new ApiError(403, 'A doctor account is required.');
    const result = await pool.query(
      `SELECT u.id, u.name, u.email FROM doctor_patients d
      JOIN users u ON u.id = d.patient_id WHERE d.doctor_id = $1 AND u.role = 'patient' ORDER BY u.name, u.id`,
      [req.user.id],
    );
    res.json({ patients: result.rows });
  });
  return router;
}
