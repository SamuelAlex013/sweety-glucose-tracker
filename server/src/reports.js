import { Router } from 'express';
import { reportRanges, validateDate } from '../../shared/domain.js';
import { readingColumns, validId } from './readings.js';
import { ApiError } from './errors.js';
import { noCache } from './cache.js';

export function reportsRouter(pool, getToday, cache = noCache) {
  const router = Router();
  router.get('/', async (req, res) => {
    const date = req.query.date || getToday();
    const error = validateDate(date, getToday());
    if (error) throw new ApiError(400, error, { date: error });
    const patientId = req.query.patientId || req.user.id;
    if (!validId(patientId)) throw new ApiError(400, 'Choose a valid patient.');
    if (req.user.role === 'doctor') {
      const assigned = await pool.query(
        'SELECT 1 FROM doctor_patients WHERE doctor_id = $1 AND patient_id = $2',
        [req.user.id, patientId],
      );
      if (!assigned.rowCount) throw new ApiError(403, 'Choose a patient assigned to your account.');
    } else if (patientId !== req.user.id) throw new ApiError(403, 'Choose your own journal.');
    const user = await pool.query(
      "SELECT report_version FROM users WHERE id = $1 AND role = 'patient'",
      [patientId],
    );
    if (!user.rowCount) throw new ApiError(404, 'Patient not found.');
    const version = user.rows[0].report_version;
    const cached = await cache.get(patientId, version, date);
    if (cached) return res.set('X-Report-Cache', 'HIT').json(cached);
    const ranges = reportRanges(date);
    // One query/snapshot keeps all three reports consistent during concurrent edits.
    const result = await pool.query(
      `SELECT ${readingColumns} FROM readings WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date, array_position(ARRAY['morning','breakfast','lunch','dinner'], slot)`,
      [patientId, ranges.monthly.start, date],
    );
    const reports = Object.fromEntries(
      Object.entries(ranges).map(([type, range]) => {
        const readings = result.rows.filter(
          (reading) => reading.date >= range.start && reading.date <= range.end,
        );
        const values = readings.map((reading) => reading.value);
        return [
          type,
          {
            ...range,
            count: values.length,
            highest: values.length ? Math.max(...values) : null,
            lowest: values.length ? Math.min(...values) : null,
            average: values.length
              ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) /
                10
              : null,
            readings,
          },
        ];
      }),
    );
    await cache.set(patientId, version, date, { reports });
    res.set('X-Report-Cache', cache.enabled ? 'MISS' : 'BYPASS').json({ reports });
  });
  return router;
}
