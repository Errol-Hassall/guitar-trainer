/** UTC date helpers and streak computation. Date keys are 'YYYY-MM-DD' in UTC. */

function toKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export function previousDayUtc(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return toKey(new Date(Date.UTC(year, month - 1, day - 1)))
}

/** Monday of the UTC week containing the given date (ISO: Sunday ends the week). */
export function weekStartUtc(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const offset = weekday === 0 ? 6 : weekday - 1
  return toKey(new Date(Date.UTC(year, month - 1, day - offset)))
}

/**
 * Consecutive covered days ending today (or yesterday, if today is not yet
 * covered). A day is covered by any session row — full, light or rest.
 */
export function computeStreak(coveredDates: Set<string>, todayKey: string): number {
  let cursor = coveredDates.has(todayKey) ? todayKey : previousDayUtc(todayKey)
  let count = 0
  while (coveredDates.has(cursor)) {
    count += 1
    cursor = previousDayUtc(cursor)
  }
  return count
}
