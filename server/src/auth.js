import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ApiError } from './errors.js';

const COOKIE = 'sweety_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cookieOptions = (secure) => ({ httpOnly: true, secure, sameSite: 'strict', path: '/' });

export function authMiddleware(pool) {
  return async (req, res, next) => {
    const token = req.cookies[COOKIE];
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
      throw new ApiError(401, 'Please log in to continue.');
    const result = await pool.query(
      'SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()',
      [hashToken(token)],
    );
    if (!result.rowCount) throw new ApiError(401, 'Your session has expired. Please log in again.');
    req.user = result.rows[0];
    next();
  };
}

export function authRouter(pool, { production }) {
  const router = Router();
  const requireAuth = authMiddleware(pool);
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  });
  // A fixed dummy hash makes unknown-email logins perform the same bcrypt work.
  const dummyHash = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);

  async function startSession(user, res) {
    const token = randomBytes(32).toString('hex');
    await pool.query('DELETE FROM sessions WHERE expires_at <= now()');
    await pool.query('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
      hashToken(token),
      user.id,
      new Date(Date.now() + SESSION_MS),
    ]);
    res.cookie(COOKIE, token, { ...cookieOptions(production), maxAge: SESSION_MS });
    return { id: user.id, name: user.name, email: user.email };
  }

  router.post('/register', limiter, async (req, res) => {
    const { name, email, password } = req.body || {};
    const fields = {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80)
      fields.name = 'Enter a name between 1 and 80 characters.';
    if (typeof email !== 'string' || email.length > 254 || !emailPattern.test(email.trim()))
      fields.email = 'Enter a valid email address.';
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72)
      fields.password = 'Use at least 8 characters and no more than 72 UTF-8 bytes.';
    if (Object.keys(fields).length)
      throw new ApiError(400, 'Check the highlighted fields.', fields);
    const user = { id: randomUUID(), name: name.trim(), email: email.trim().toLowerCase() };
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      await pool.query(
        'INSERT INTO users(id, name, email, password_hash) VALUES ($1, $2, $3, $4)',
        [user.id, user.name, user.email, passwordHash],
      );
    } catch (error) {
      if (error.code === '23505')
        throw new ApiError(409, 'An account with this email already exists.', {
          email: 'An account with this email already exists.',
        });
      throw error;
    }
    res.status(201).json({ user: await startSession(user, res) });
  });

  router.post('/login', limiter, async (req, res) => {
    const { email, password } = req.body || {};
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.length > 254 ||
      Buffer.byteLength(password) > 72
    ) {
      throw new ApiError(400, 'Enter your email and password.');
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [
      email.trim().toLowerCase(),
    ]);
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user?.password_hash || dummyHash);
    if (!user || !valid) throw new ApiError(401, 'Email or password is incorrect.');
    res.json({ user: await startSession(user, res) });
  });

  router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
  router.post('/logout', async (req, res) => {
    const token = req.cookies[COOKIE];
    if (typeof token === 'string')
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
    res.clearCookie(COOKIE, cookieOptions(production));
    res.status(204).end();
  });
  return router;
}
