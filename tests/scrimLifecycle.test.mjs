import assert from 'node:assert/strict';
import test from 'node:test';
import { canCompleteScrim, canReportNoShow, isCheckInWindowOpen } from '../lib/scrimLifecycle.mjs';

const scheduledAt = '2026-10-01T20:00:00.000Z';
const start = Date.parse(scheduledAt);

test('check-in opens exactly 30 minutes before a scrim and closes after 30 minutes', () => {
  assert.equal(isCheckInWindowOpen(scheduledAt, start - 30 * 60 * 1000), true);
  assert.equal(isCheckInWindowOpen(scheduledAt, start + 30 * 60 * 1000), true);
  assert.equal(isCheckInWindowOpen(scheduledAt, start - 30 * 60 * 1000 - 1), false);
  assert.equal(isCheckInWindowOpen(scheduledAt, start + 30 * 60 * 1000 + 1), false);
});

test('completion requires a confirmed scrim, elapsed duration, and both team check-ins', () => {
  const base = {
    status: 'confirmed',
    scheduledAt,
    durationMinutes: 60,
    postingTeamCheckedIn: true,
    opponentTeamCheckedIn: true,
  };

  assert.equal(canCompleteScrim({ ...base, now: start + 60 * 60 * 1000 - 1 }), false);
  assert.equal(canCompleteScrim({ ...base, now: start + 60 * 60 * 1000 }), true);
  assert.equal(
    canCompleteScrim({ ...base, opponentTeamCheckedIn: false, now: start + 60 * 60 * 1000 }),
    false
  );
  assert.equal(
    canCompleteScrim({ ...base, status: 'completed', now: start + 60 * 60 * 1000 }),
    false
  );
});

test('no-show reporting requires a confirmed scrim, one checked-in team, and a missing opponent', () => {
  const base = {
    status: 'confirmed',
    scheduledAt,
    myTeamCheckedIn: true,
    otherTeamCheckedIn: false,
  };

  assert.equal(canReportNoShow({ ...base, now: start + 30 * 60 * 1000 - 1 }), false);
  assert.equal(canReportNoShow({ ...base, now: start + 30 * 60 * 1000 }), true);
  assert.equal(
    canReportNoShow({ ...base, otherTeamCheckedIn: true, now: start + 30 * 60 * 1000 }),
    false
  );
  assert.equal(
    canReportNoShow({ ...base, myTeamCheckedIn: false, now: start + 30 * 60 * 1000 }),
    false
  );
});
