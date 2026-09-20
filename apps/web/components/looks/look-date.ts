/**
 * Date helpers shared by the look card and forms.
 *
 * `wornAt` arrives as a Date from Prisma on the server and as an ISO string
 * from the API on the client, so both spellings have to be accepted.
 */

/** Human-readable, e.g. "14 September 2026". */
export function formatWornAt(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)

  // Fixed locale rather than the visitor's: this renders on the server and
  // again on the client, and a locale-dependent string would not match.
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** `YYYY-MM-DD`, the only format `<input type="date">` accepts. */
export function toDateInputValue(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)

  // Built from local parts, not toISOString(), which shifts to UTC and can
  // land a date on the previous day for anyone east of Greenwich.
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}
