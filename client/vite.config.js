import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import dotenv from 'dotenv';

export default defineConfig(() => {
  const envPath = fileURLToPath(new URL('../.env', import.meta.url));
  // Read the API port without making the server's NODE_ENV override a Vite production build.
  const env = existsSync(envPath) ? dotenv.parse(readFileSync(envPath)) : {};
  return {
    plugins: [react()],
    server: {
      strictPort: true,
      port: 5173,
      proxy: { '/api': `http://127.0.0.1:${process.env.PORT || env.PORT || 3001}` },
    },
    test: { environment: 'jsdom', setupFiles: './src/test/setup.js' },
  };
});
