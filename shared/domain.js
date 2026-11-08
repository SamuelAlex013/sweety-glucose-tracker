export const SLOTS = [
  {
    id: 'morning',
    label: 'Morning (fasting)',
    short: 'Morning',
    context: 'Before your first meal',
  },
  {
    id: 'breakfast',
    label: 'After breakfast',
    short: 'Breakfast',
    context: 'After your morning meal',
  },
  { id: 'lunch', label: 'After lunch', short: 'Lunch', context: 'After your midday meal' },
  { id: 'dinner', label: 'After dinner', short: 'Dinner', context: 'After your evening meal' },
];

export function todayIn(timeZone = 'UTC', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value >= '1900-01-01'
  );
}

export function validateDate(date, today) {
  if (!isDate(date)) return 'Choose a valid date (1900 or later).';
  if (date > today) return 'Date cannot be in the future.';
  return null;
}

export function validateReading({ date, slot, value }, today) {
  const errors = {};
  const dateError = validateDate(date, today);
  if (dateError) errors.date = dateError;
  if (!SLOTS.some((item) => item.id === slot)) errors.slot = 'Choose one of the four time slots.';
  if (value === '' || value === undefined || value === null) {
    errors.value = 'Please enter a glucose value.';
  } else if (
    !['string', 'number'].includes(typeof value) ||
    !/^\d+$/.test(String(value)) ||
    Number(value) < 40 ||
    Number(value) > 600
  ) {
    errors.value = 'Value must be a whole number between 40 and 600 mg/dl.';
  }
  return errors;
}

export function reportRanges(date) {
  const first = `${date.slice(0, 7)}-01`;
  const previousEnd = new Date(`${first}T00:00:00Z`);
  previousEnd.setUTCDate(0);
  const end = previousEnd.toISOString().slice(0, 10);
  return {
    daily: { start: date, end: date },
    mtd: { start: first, end: date },
    monthly: { start: `${end.slice(0, 7)}-01`, end },
  };
}
