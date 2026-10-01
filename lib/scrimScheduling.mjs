export function localDateInputValue(date = new Date()) {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function dateKeyInTimeZone(isoDate, timeZone) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) return '';

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone,
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts
        .filter((part) => ['year', 'month', 'day'].includes(part.type))
        .map((part) => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return localDateInputValue(date);
  }
}
