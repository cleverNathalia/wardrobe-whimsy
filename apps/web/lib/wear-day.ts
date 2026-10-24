/**
 * Formats a stored wear day (`YYYY-MM-DD`), e.g. "24 October 2026".
 *
 * Read in UTC because that is how the day is stored: midnight UTC on the
 * chosen date. Formatting it in local time would show the previous day for
 * anyone west of Greenwich.
 */
export function formatWearDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
