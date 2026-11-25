export interface FocusInput {
  dueCount: number
  /** Names of the first due exercises, most stale first. */
  topDueNames: string[]
  streakCount: number
  practicedDaysThisWeek: number
  theme: string
}

/**
 * Rule-based session-focus suggestion derived from practice data.
 * Deterministic and local — no model call, no network.
 */
export function suggestFocus(input: FocusInput): string {
  const { dueCount, topDueNames, streakCount, practicedDaysThisWeek, theme } = input
  if (dueCount > 0) {
    const noun = dueCount === 1 ? 'exercise' : 'exercises'
    return topDueNames.length > 0
      ? `You have ${dueCount} ${noun} due for review — start with “${topDueNames[0]}”.`
      : `You have ${dueCount} ${noun} due for review.`
  }
  if (practicedDaysThisWeek === 0 && streakCount === 0) {
    return 'No practice yet this week — a light session is enough to restart the streak.'
  }
  if (streakCount >= 3) {
    return `${streakCount}-day streak — keep it going with today’s theme: ${theme}.`
  }
  return `Today’s theme is ${theme} — give it at least one full section.`
}
