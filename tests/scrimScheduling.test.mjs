import assert from 'node:assert/strict';
import test from 'node:test';
import { dateKeyInTimeZone, localDateInputValue } from '../lib/scrimScheduling.mjs';

test('localDateInputValue returns the date for a local date input', () => {
  assert.equal(localDateInputValue(new Date(2026, 8, 30, 20, 0)), '2026-09-30');
});

test('dateKeyInTimeZone matches the scrim schedule timezone', () => {
  const scheduledAt = '2026-10-01T01:00:00.000Z';

  assert.equal(dateKeyInTimeZone(scheduledAt, 'America/New_York'), '2026-09-30');
  assert.equal(dateKeyInTimeZone(scheduledAt, 'Europe/London'), '2026-10-01');
});
