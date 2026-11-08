import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  port: Number(process.env.PORT || 3001),
  origin: process.env.APP_ORIGIN || 'http://localhost:5173',
  timeZone: process.env.APP_TIMEZONE || 'UTC',
  production: process.env.NODE_ENV === 'production',
  trustProxy: process.env.TRUST_PROXY === '1',
};

// Fail at startup for a misspelled timezone rather than failing on the first request.
new Intl.DateTimeFormat('en', { timeZone: config.timeZone });
