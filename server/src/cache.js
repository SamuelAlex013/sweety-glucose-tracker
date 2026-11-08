import Redis from 'ioredis';

export const noCache = {
  enabled: false,
  get: async () => null,
  set: async () => {},
  invalidate: async () => {},
  close: async () => {},
};

export async function createReportCache(url, prefix = 'sweety:reports') {
  if (!url) return noCache;
  const redis = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    commandTimeout: 700,
    retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
  });
  redis.on('error', () => {});
  await redis.connect();
  const key = (user, version, date) => `${prefix}:${user}:${version}:${date}`;
  async function attempt(operation, fallback = null) {
    try {
      return await operation();
    } catch (error) {
      console.error('Report cache unavailable:', { code: error.code || error.name });
      return fallback;
    }
  }
  return {
    enabled: true,
    get: (user, version, date) =>
      attempt(async () => {
        const value = await redis.get(key(user, version, date));
        return value ? JSON.parse(value) : null;
      }),
    set: (user, version, date, value) =>
      attempt(() => redis.set(key(user, version, date), JSON.stringify(value), 'EX', 300)),
    invalidate: (user) =>
      attempt(async () => {
        let cursor = '0';
        do {
          const result = await redis.scan(cursor, 'MATCH', `${prefix}:${user}:*`, 'COUNT', 100);
          cursor = result[0];
          if (result[1].length) await redis.del(...result[1]);
        } while (cursor !== '0');
      }),
    close: async () => {
      redis.disconnect();
    },
    ping: () => redis.ping(),
  };
}
