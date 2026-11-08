import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { todayIn } from '../../shared/domain.js';
import { config } from './config.js';
import { authRouter, authMiddleware } from './auth.js';
import { readingsRouter } from './readings.js';
import { reportsRouter } from './reports.js';
import { ApiError, errorHandler } from './errors.js';

export function createApp(pool, options = {}) {
  const settings = { ...config, ...options };
  const getToday = options.getToday || (() => todayIn(settings.timeZone));
  const app = express();
  app.disable('x-powered-by');
  if (settings.trustProxy) app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('Origin') && req.get('Origin') !== settings.origin)
        throw new ApiError(403, 'This request origin is not allowed.');
      if (req.get('Sec-Fetch-Site') === 'cross-site')
        throw new ApiError(403, 'Cross-site requests are not allowed.');
      if (req.method !== 'DELETE' && !req.is('application/json'))
        throw new ApiError(415, 'Send this request as application/json.');
    }
    next();
  });
  app.get('/api/health', async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });
  app.get('/api/config', (req, res) =>
    res.json({ today: getToday(), timeZone: settings.timeZone }),
  );
  app.use('/api/auth', authRouter(pool, settings));
  app.use('/api/readings', authMiddleware(pool), readingsRouter(pool, getToday));
  app.use('/api/reports', authMiddleware(pool), reportsRouter(pool, getToday));
  app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));
  if (settings.production) {
    const dist = fileURLToPath(new URL('../../client/dist/', import.meta.url));
    app.use(express.static(dist));
    app.get('/{*path}', (req, res) => res.sendFile(`${dist}/index.html`));
  }
  app.use(errorHandler);
  return app;
}
