import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReading, reportRanges, todayIn } from '../../shared/domain.js';

const valid = { date: '2026-10-15', slot: 'lunch', value: 110 };
test('whole-number glucose validation rejects blanks, coercion, decimals, and out-of-range values', () => {
  for (const value of ['', null, undefined]) assert.equal(validateReading({ ...valid, value }, '2026-10-15').value, 'Please enter a glucose value.');
  for (const value of [39, 601, 100.5, '100.5', '1e2', true, [], {}, ' ', '-40']) assert.ok(validateReading({ ...valid, value }, '2026-10-15').value, `Rejected ${JSON.stringify(value)}`);
  for (const value of [40, 600, '110']) assert.deepEqual(validateReading({ ...valid, value }, '2026-10-15'), {});
});
test('dates must be real, nonfuture calendar dates, with a known slot', () => {
  for (const date of ['2026-02-29', '2026-04-31', '15/10/2026', '', '1899-12-31', ['2026-10-15']]) assert.ok(validateReading({ ...valid, date }, '2026-10-15').date);
  assert.equal(validateReading({ ...valid, date: '2026-10-16' }, '2026-10-15').date, 'Date cannot be in the future.');
  assert.ok(validateReading({ ...valid, slot: 'snack' }, '2026-10-15').slot);
});
test('report ranges match the brief and handle January and leap-year boundaries', () => {
  assert.deepEqual(reportRanges('2026-10-15'), {
    daily: { start: '2026-10-15', end: '2026-10-15' },
    mtd: { start: '2026-10-01', end: '2026-10-15' },
    monthly: { start: '2026-09-01', end: '2026-09-30' },
  });
  assert.deepEqual(reportRanges('2026-01-01').monthly, { start: '2025-12-01', end: '2025-12-31' });
  assert.deepEqual(reportRanges('2024-03-01').monthly, { start: '2024-02-01', end: '2024-02-29' });
});
test('today follows the configured timezone at midnight boundaries', () => {
  const now = new Date('2026-10-15T23:30:00Z');
  assert.equal(todayIn('UTC', now), '2026-10-15');
  assert.equal(todayIn('Asia/Kolkata', now), '2026-10-16');
});
