import { describe, expect, it } from 'vitest'
import { REVIEW_INTERVAL_DAYS, dueForReview, isDueForReview } from '#/lib/review'
import type { ExerciseSummary } from '#/lib/types'

// Fixed "now" so the day-boundary checks are deterministic.
const NOW = new Date(Date.UTC(2026, 10, 26, 12, 0, 0))

function daysAgoIso(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString()
}

function exercise(id: number, lastPracticedAt: string | null): ExerciseSummary {
  return {
    id,
    name: `Exercise ${id}`,
    hasTiming: true,
    difficulty: 3,
    tags: [],
    tabText: '',
    isBuiltin: false,
    createdAt: daysAgoIso(30),
    updatedAt: daysAgoIso(30),
    logCount: lastPracticedAt === null ? 0 : 1,
    latestBpm: null,
    latestRating: null,
    lastPracticedAt,
  }
}

describe('isDueForReview', () => {
  it('never-practiced exercises are not due (nothing to review yet)', () => {
    expect(isDueForReview(null, NOW)).toBe(false)
  })

  it('practices within the interval are not due', () => {
    expect(isDueForReview(daysAgoIso(0), NOW)).toBe(false)
    expect(isDueForReview(daysAgoIso(REVIEW_INTERVAL_DAYS - 1), NOW)).toBe(false)
  })

  it('the interval boundary is inclusive', () => {
    expect(isDueForReview(daysAgoIso(REVIEW_INTERVAL_DAYS), NOW)).toBe(true)
    expect(isDueForReview(daysAgoIso(REVIEW_INTERVAL_DAYS + 1), NOW)).toBe(true)
  })
})

describe('dueForReview', () => {
  it('keeps only due exercises, in list order', () => {
    const fresh = exercise(1, daysAgoIso(2))
    const stale = exercise(2, daysAgoIso(9))
    const never = exercise(3, null)
    const boundary = exercise(4, daysAgoIso(REVIEW_INTERVAL_DAYS))

    expect(dueForReview([fresh, stale, never, boundary], NOW).map((item) => item.id)).toEqual([
      2, 4,
    ])
  })

  it('returns an empty list when nothing is due', () => {
    expect(dueForReview([], NOW)).toEqual([])
    expect(dueForReview([exercise(1, daysAgoIso(1))], NOW)).toEqual([])
  })
})
