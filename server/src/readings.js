import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { SLOTS, validateDate, validateReading } from '../../shared/domain.js';
import { ApiError } from './errors.js';
import { noCache } from './cache.js';

export const readingColumns = "id, to_char(date, 'YYYY-MM-DD') AS date, slot, value";
export const validId = (id) =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function readingsRouter(pool, getToday, cache = noCache) {
  const router = Router();
  async function change(userId, operation) {
    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
      result = await operation(client);
      await client.query('UPDATE users SET report_version = report_version + 1 WHERE id = $1', [
        userId,
      ]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    await cache.invalidate(userId);
    return result;
  }
  router.get('/', async (req, res) => {
    const { date } = req.query;
    const page = req.query.page ?? '1';
    const limit = req.query.limit ?? '20';
    if (
      typeof page !== 'string' ||
      !/^[1-9]\d*$/.test(page) ||
      Number(page) > 1000000 ||
      typeof limit !== 'string' ||
      !/^[1-9]\d*$/.test(limit) ||
      Number(limit) > 100
    ) {
      throw new ApiError(400, 'Use a positive page number and a limit between 1 and 100.');
    }
    if (date !== undefined) {
      const error = validateDate(date, getToday());
      if (error) throw new ApiError(400, error, { date: error });
    }
    const result = await pool.query(
      `WITH filtered AS (
        SELECT ${readingColumns} FROM readings WHERE user_id = $1 AND ($2::date IS NULL OR date = $2::date)
      ), selected AS (
        SELECT * FROM filtered ORDER BY date DESC, array_position(ARRAY['morning','breakfast','lunch','dinner'], slot), id LIMIT $3 OFFSET $4
      ) SELECT (SELECT count(*)::int FROM filtered) AS total,
        COALESCE(json_agg(selected ORDER BY selected.date DESC, array_position(ARRAY['morning','breakfast','lunch','dinner'], selected.slot), selected.id), '[]'::json) AS readings FROM selected`,
      [req.user.id, date || null, Number(limit), (Number(page) - 1) * Number(limit)],
    );
    const { readings, total } = result.rows[0];
    res.json({
      readings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  });

  async function save(req, res) {
    const editing = req.method === 'PUT';
    if (editing && !validId(req.params.id)) throw new ApiError(404, 'Reading not found.');
    const body = req.body || {};
    const errors = validateReading(body, getToday());
    if (Object.keys(errors).length)
      throw new ApiError(400, 'Check the highlighted fields.', errors);
    const { date, slot } = body;
    const reading = await change(req.user.id, async (client) => {
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
        const label = SLOTS.find((item) => item.id === slot).label;
        const message = `You already have ${slot === 'morning' ? 'a' : 'an'} ${label} reading for this date.`;
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
      return result.rows[0];
    });
    res.status(editing ? 200 : 201).json({ reading });
  }
  router.post('/', save);
  router.put('/:id', save);
  router.delete('/:id', async (req, res) => {
    if (!validId(req.params.id)) throw new ApiError(404, 'Reading not found.');
    await change(req.user.id, async (client) => {
      const result = await client.query('DELETE FROM readings WHERE id = $1 AND user_id = $2', [
        req.params.id,
        req.user.id,
      ]);
      if (!result.rowCount) throw new ApiError(404, 'Reading not found.');
    });
    res.status(204).end();
  });
  return router;
}
