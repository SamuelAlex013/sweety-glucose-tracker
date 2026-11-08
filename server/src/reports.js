import { Router } from 'express';
import { reportRanges, validateDate } from '../../shared/domain.js';
import { readingColumns } from './readings.js';
import { ApiError } from './errors.js';

export function reportsRouter(pool, getToday) {
  const router = Router();
  router.get('/', async (req, res) => {
    const date = req.query.date || getToday();
    const error = validateDate(date, getToday());
    if (error) throw new ApiError(400, error, { date: error });
    const ranges = reportRanges(date);
    // One query/snapshot keeps all three reports consistent during concurrent edits.
    const result = await pool.query(
      `SELECT ${readingColumns} FROM readings WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date, array_position(ARRAY['morning','breakfast','lunch','dinner'], slot)`,
      [req.user.id, ranges.monthly.start, date],
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
    res.json({ reports });
  });
  return router;
}
