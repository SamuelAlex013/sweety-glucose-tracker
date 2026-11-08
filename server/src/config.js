import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  secureCookies: process.env.COOKIE_SECURE,
  reminderCron: process.env.REMINDER_CRON || '0 20 * * *',
  port: Number(process.env.PORT || 3001),
  origin: process.env.APP_ORIGIN || 'http://localhost:5173',
  timeZone: process.env.APP_TIMEZONE || 'UTC',
  production: process.env.NODE_ENV === 'production',
  trustProxy: process.env.TRUST_PROXY === '1',
};

// Fail at startup for a misspelled timezone rather than failing on the first request.
new Intl.DateTimeFormat('en', { timeZone: config.timeZone });
if (config.secureCookies !== undefined && !['true', 'false'].includes(config.secureCookies)) {
  throw new Error('Set COOKIE_SECURE to true or false.');
}
