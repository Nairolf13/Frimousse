// Builds the [first, last] day-of-month bounds for a backend date-range query,
// anchored in UTC rather than the browser's local timezone.
//
// `new Date(year, month + 1, 0).toISOString()` looks right but isn't: during
// French winter time (UTC+1), a local midnight converts to 23:00 UTC the
// previous day. The backend then silently excludes the last day of the month
// from range queries built this way — e.g. the 30th of November would never
// show up on the planning calendar once winter time kicked in. Building the
// bounds directly in UTC sidesteps the conversion entirely.
export function monthRangeUTC(year: number, month: number): { first: Date; last: Date } {
  const first = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const last = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { first, last };
}
