import type { ExerciseSummary } from './types'

/** An exercised exercise is due for review after this many days without practice. */
export const REVIEW_INTERVAL_DAYS = 7

const MS_PER_DAY = 86_400_000

/** Whole days between the given ISO timestamp and `now` (0 when same day). */
export function daysSince(lastPracticedAt: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(lastPracticedAt).getTime()) / MS_PER_DAY)
}

/** Never-practiced exercises are not due — there is nothing to review yet. */
export function isDueForReview(lastPracticedAt: string | null, now: Date): boolean {
  if (lastPracticedAt === null) return false
  return daysSince(lastPracticedAt, now) >= REVIEW_INTERVAL_DAYS
}

export function dueForReview(exercises: ExerciseSummary[], now: Date): ExerciseSummary[] {
  return exercises.filter((exercise) => isDueForReview(exercise.lastPracticedAt, now))
}
