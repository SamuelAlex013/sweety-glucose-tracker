import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('a patient can register, validate, record, edit, report, delete, and log back in', async ({
  page,
}) => {
  const email = `e2e-${randomUUID()}@example.com`;
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill('Jamie');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Journal-test-2026');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A little check-in, Jamie.' })).toBeVisible();
  await expect(page.getByText('Your picture starts with a reading')).toBeVisible();
  await page.getByRole('button', { name: 'Add After lunch', exact: true }).click();
  await page.getByRole('button', { name: 'Save reading' }).click();
  await expect(page.getByText('Please enter a glucose value.')).toBeVisible();
  await page.getByRole('spinbutton').fill('601');
  await page.getByRole('button', { name: 'Save reading' }).click();
  await expect(
    page.getByText('Value must be a whole number between 40 and 600 mg/dl.'),
  ).toBeVisible();
  await page.getByRole('spinbutton').fill('125');
  await page.getByRole('button', { name: 'Save reading' }).click();
  await expect(page.getByText('1 of 4 recorded')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit After lunch' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit After lunch' }).click();
  await page.getByRole('spinbutton').fill('135');
  await page.getByRole('button', { name: 'Save reading' }).click();
  await expect(page.getByText('Reading updated.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Month to date', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Readings in this report' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '135', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await expect(page.getByText('Your picture starts with a reading')).toBeVisible();
  await page.getByRole('button', { name: 'Daily', exact: true }).click();
  await page.getByRole('button', { name: 'Delete After lunch' }).click();
  await page.getByRole('button', { name: 'Keep reading' }).click();
  await expect(page.getByText('1 of 4 recorded')).toBeVisible();
  await page.getByRole('button', { name: 'Delete After lunch' }).click();
  await page.getByRole('button', { name: 'Delete reading', exact: true }).click();
  await expect(page.getByText('0 of 4 recorded')).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Journal-test-2026');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByText('0 of 4 recorded')).toBeVisible();
});

test('mobile layout keeps the journal and form within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill('Mobile');
  await page.getByLabel('Email address').fill(`mobile-${randomUUID()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('Journal-test-2026');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('0 of 4 recorded')).toBeVisible();
  await page.getByRole('button', { name: 'Add reading', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Add a reading' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('spinbutton').fill('110');
  await page.getByRole('button', { name: 'Save reading' }).click();
  await expect(page.getByText('1 of 4 recorded')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
