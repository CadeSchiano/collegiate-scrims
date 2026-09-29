const MINUTE_MS = 60 * 1000;

function toTimestamp(value) {
  const timestamp = new Date(value).valueOf();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isCheckInWindowOpen(scheduledAt, now = Date.now()) {
  const start = toTimestamp(scheduledAt);

  if (start === null) return false;

  return now >= start - 30 * MINUTE_MS && now <= start + 30 * MINUTE_MS;
}

export function canCompleteScrim({
  status,
  scheduledAt,
  durationMinutes,
  postingTeamCheckedIn,
  opponentTeamCheckedIn,
  now = Date.now(),
}) {
  const start = toTimestamp(scheduledAt);

  if (start === null || !Number.isFinite(durationMinutes)) return false;

  return (
    status === 'confirmed' &&
    now >= start + durationMinutes * MINUTE_MS &&
    postingTeamCheckedIn &&
    opponentTeamCheckedIn
  );
}

export function canReportNoShow({
  status,
  scheduledAt,
  myTeamCheckedIn,
  otherTeamCheckedIn,
  now = Date.now(),
}) {
  const start = toTimestamp(scheduledAt);

  if (start === null) return false;

  return (
    status === 'confirmed' &&
    now >= start + 30 * MINUTE_MS &&
    myTeamCheckedIn &&
    !otherTeamCheckedIn
  );
}
