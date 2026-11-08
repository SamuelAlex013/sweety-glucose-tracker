import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { config } from '../server/src/config.js';
import { SLOTS } from '../shared/domain.js';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
await page.emulateMedia({ reducedMotion: 'reduce' });
const errors = [];
const captured = [];
page.on('pageerror', (error) => errors.push(error.message));
const directory = new URL('../docs/screenshots/', import.meta.url);
await mkdir(directory, { recursive: true });
async function capture(name) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({
    path: fileURLToPath(new URL(name, directory)),
    fullPage: true,
    animations: 'disabled',
  });
  captured.push(name);
}
async function login(email, password) {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByRole('button', { name: 'Log out' }).waitFor();
}
async function add(slot, value) {
  await page.getByRole('button', { name: `Add ${slot.label}`, exact: true }).click();
  await page.getByRole('spinbutton').fill(String(value));
  await page.getByRole('button', { name: 'Save reading' }).click();
  await page.getByRole('button', { name: `Edit ${slot.label}`, exact: true }).waitFor();
}
try {
  await page.goto(config.origin);
  const { today } = await (await page.request.get(`${config.origin}/api/config`)).json();
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
  await capture('login.png');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill('Samuel Alexander');
  await page.getByLabel('Email address').fill(`capture-${randomUUID()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('Screenshot-demo-2026');
  await capture('signup.png');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByText('Add readings for this period').waitFor();
  await capture('empty-report.png');

  await page.getByRole('button', { name: 'Add Morning (fasting)', exact: true }).click();
  await page.getByRole('button', { name: 'Save reading' }).click();
  await page.getByText('Please enter a glucose value.').waitFor();
  await capture('validation-desktop.png');
  await page.getByRole('spinbutton').fill('601');
  await page.getByRole('button', { name: 'Save reading' }).click();
  await page.getByText('Value must be a whole number between 40 and 600 mg/dl.').waitFor();
  await capture('validation-range.png');
  await page.getByRole('spinbutton').fill('110');
  await page.getByLabel('Date', { exact: true }).fill('9999-12-31');
  await page.getByRole('button', { name: 'Save reading' }).click();
  await page.getByText('Date cannot be in the future.').waitFor();
  await capture('validation-future.png');
  await page.getByLabel('Date', { exact: true }).fill(today);
  await capture('reading-form.png');
  await page.getByRole('button', { name: 'Save reading' }).click();
  await page.getByText('1 of 4 recorded').waitFor();

  await page.getByRole('button', { name: 'Add reading', exact: true }).click();
  await page.getByLabel('Time slot').selectOption('morning');
  await page.getByRole('spinbutton').fill('112');
  await page.getByRole('button', { name: 'Save reading' }).click();
  await page.getByRole('alert').filter({ hasText: 'already have' }).waitFor();
  await capture('validation-duplicate.png');
  await page.getByRole('button', { name: 'Close reading form' }).click();
  for (const [index, slot] of SLOTS.slice(1).entries()) await add(slot, [138, 129, 124][index]);
  await page.getByText('4 of 4 recorded').waitFor();
  await capture('four-readings.png');
  await page.getByRole('button', { name: 'Add reading', exact: true }).click();
  await page.getByRole('spinbutton').fill('120');
  await page.getByRole('button', { name: 'Save reading' }).click();
  await page.getByRole('alert').filter({ hasText: 'only 4' }).waitFor();
  await capture('validation-limit.png');
  await page.getByRole('button', { name: 'Close reading form' }).click();
  await page.getByRole('button', { name: 'Edit After lunch' }).click();
  await page.getByRole('spinbutton').fill('142');
  await capture('edit-form.png');
  await page.getByRole('button', { name: 'Save reading' }).click();
  await page.getByText('Reading updated.', { exact: true }).waitFor();
  await capture('edited-reading.png');
  await page.getByText('Reading updated.', { exact: true }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Delete After dinner' }).click();
  await capture('delete-confirmation.png');
  await page.getByRole('button', { name: 'Delete reading', exact: true }).click();
  await page.getByText('3 of 4 recorded').waitFor();
  await capture('deleted-reading.png');

  await page.getByRole('button', { name: 'Log out' }).click();
  await login(
    process.env.DEMO_EMAIL || 'demo@sweety.local',
    process.env.DEMO_PASSWORD || 'SweetyDemo2026!',
  );
  await page.getByRole('heading', { name: 'Daily readings' }).waitFor();
  const continuousRail = await page.evaluate(
    () =>
      Math.abs(
        document.querySelector('.sidebar').getBoundingClientRect().height -
          document.querySelector('.app-shell').getBoundingClientRect().height,
      ) <= 1,
  );
  if (!continuousRail) throw new Error('The desktop navigation rail does not span the page.');
  await capture('daily-desktop.png');
  await page.getByRole('button', { name: 'Month to date', exact: true }).click();
  await page.getByRole('heading', { name: 'Readings in this report' }).waitFor();
  await capture('month-to-date.png');
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await page.getByRole('heading', { name: 'Previous month', exact: true }).waitFor();
  await capture('previous-month.png');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('heading', { name: 'Saved readings' }).waitFor();
  await capture('history-page-1.png');
  await page.getByRole('button', { name: 'Next page' }).click();
  await page.getByRole('status').filter({ hasText: 'Page 2 of' }).waitFor();
  await capture('history-page-2.png');
  await page.getByRole('button', { name: 'Reminders', exact: true }).click();
  await page.locator('.reminder-list li').first().waitFor();
  await capture('reminders.png');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'My journal', exact: true }).click();
  await page.getByRole('heading', { name: 'Daily readings' }).waitFor();
  await capture('daily-mobile.png');
  await page.getByRole('button', { name: 'Add After lunch', exact: true }).click();
  await page.getByRole('spinbutton').fill('124');
  await capture('reading-form-mobile.png');
  await page.getByRole('button', { name: 'Close reading form' }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow || errors.length) throw new Error(JSON.stringify({ overflow, errors }));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(
    process.env.DEMO_DOCTOR_EMAIL || 'doctor@sweety.local',
    process.env.DEMO_DOCTOR_PASSWORD || 'SweetyDoctor2026!',
  );
  await page.getByRole('heading', { name: 'Month to date', exact: true }).waitFor();
  await capture('doctor-reports.png');
  await page.getByRole('button', { name: 'Daily', exact: true }).click();
  await page.getByRole('heading', { name: 'Daily overview' }).waitFor();
  await capture('doctor-daily.png');
  console.log(
    `Saved ${captured.length} screenshots covering authentication, CRUD, validation, reports, pagination, check-ins, doctor access, and mobile layouts.`,
  );
} finally {
  await browser.close();
}
