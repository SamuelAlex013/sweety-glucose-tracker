import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { config } from '../server/src/config.js';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const directory = new URL('../docs/screenshots/', import.meta.url);
await mkdir(directory, { recursive: true });
const capture = (name) =>
  page.screenshot({ path: fileURLToPath(new URL(name, directory)), fullPage: true });
try {
  await page.goto(config.origin);
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
  await capture('login.png');
  await page.getByLabel('Email address').fill(process.env.DEMO_EMAIL || 'demo@sweety.local');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.DEMO_PASSWORD || 'SweetyDemo2026!');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByRole('heading', { name: 'Daily readings' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await capture('daily-desktop.png');
  await page.getByRole('button', { name: 'Month to date', exact: true }).click();
  await page.getByRole('heading', { name: 'Readings in this report' }).waitFor();
  await capture('monthly-desktop.png');
  await page.getByRole('button', { name: 'Daily', exact: true }).click();
  await page.getByRole('button', { name: 'Add reading', exact: true }).click();
  await page.getByRole('heading', { name: 'Add a reading' }).waitFor();
  await page.getByRole('button', { name: 'Save reading' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture('validation-desktop.png');
  await page.getByRole('button', { name: 'Close reading form' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('daily-mobile.png');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow || errors.length) throw new Error(JSON.stringify({ overflow, errors }));
  console.log(
    'Captured login, daily desktop/mobile, month-to-date, and validation screenshots. No page errors or mobile overflow.',
  );
} finally {
  await browser.close();
}
