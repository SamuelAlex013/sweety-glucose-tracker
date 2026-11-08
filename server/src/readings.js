import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { SLOTS, validateDate, validateReading } from '../../shared/domain.js';
import { ApiError } from './errors.js';

export const readingColumns = "id, to_char(date, 'YYYY-MM-DD') AS date, slot, value";
const validId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function readingsRouter(pool, getToday) {
  const router = Router();
  router.get('/', async (req, res) => {
    const { date } = req.query;
    if (date !== undefined) {
      const error = validateDate(date, getToday());
      if (error) throw new ApiError(400, error, { date: error });
    }
    const result = await pool.query(
      `SELECT ${readingColumns} FROM readings WHERE user_id = $1 ${date ? 'AND date = $2' : ''} ORDER BY date DESC, array_position(ARRAY['morning','breakfast','lunch','dinner'], slot)`,
      date ? [req.user.id, date] : [req.user.id],
    );
    res.json({ readings: result.rows });
  });

  async function save(req, res) {
    const editing = req.method === 'PUT';
    if (editing && !validId(req.params.id)) throw new ApiError(404, 'Reading not found.');
    const body = req.body || {};
    const errors = validateReading(body, getToday());
    if (Object.keys(errors).length)
      throw new ApiError(400, 'Check the highlighted fields.', errors);
    const { date, slot } = body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize a user's writes, including moves between dates, to make errors deterministic.
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
      if (editing) {
        const existing = await client.query(
          'SELECT id FROM readings WHERE id = $1 AND user_id = $2',
          [req.params.id, req.user.id],
        );
        if (!existing.rowCount) throw new ApiError(404, 'Reading not found.');
      }
      const existingDay = await client.query(
        'SELECT id, slot FROM readings WHERE user_id = $1 AND date = $2 AND id <> $3',
        [req.user.id, date, editing ? req.params.id : randomUUID()],
      );
      if (existingDay.rowCount >= 4)
        throw new ApiError(409, 'You can add only 4 readings per day.');
      const duplicate = existingDay.rows.some((row) => row.slot === slot);
      if (duplicate) {
        const message = `You already have a ${SLOTS.find((item) => item.id === slot).label} reading for this date.`;
        throw new ApiError(409, message, { slot: message });
      }
      const result = editing
        ? await client.query(
            `UPDATE readings SET date = $1, slot = $2, value = $3, updated_at = now() WHERE id = $4 AND user_id = $5 RETURNING ${readingColumns}`,
            [date, slot, Number(body.value), req.params.id, req.user.id],
          )
        : await client.query(
            `INSERT INTO readings(id, user_id, date, slot, value) VALUES ($1, $2, $3, $4, $5) RETURNING ${readingColumns}`,
            [randomUUID(), req.user.id, date, slot, Number(body.value)],
          );
      await client.query('COMMIT');
      res.status(editing ? 200 : 201).json({ reading: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  router.post('/', save);
  router.put('/:id', save);
  router.delete('/:id', async (req, res) => {
    if (!validId(req.params.id)) throw new ApiError(404, 'Reading not found.');
    const result = await pool.query('DELETE FROM readings WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id,
    ]);
    if (!result.rowCount) throw new ApiError(404, 'Reading not found.');
    res.status(204).end();
  });
  return router;
}
