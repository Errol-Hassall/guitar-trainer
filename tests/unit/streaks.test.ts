import { describe, expect, it } from 'vitest'
import { computeStreak, previousDayUtc, weekStartUtc } from '#/lib/streaks'

describe('computeStreak', () => {
  it('counts consecutive covered days ending today', () => {
    const covered = new Set(['2026-11-23', '2026-11-24', '2026-11-25'])
    expect(computeStreak(covered, '2026-11-25')).toBe(3)
  })

  it('stays alive when today is not yet covered but yesterday was', () => {
    const covered = new Set(['2026-11-24'])
    expect(computeStreak(covered, '2026-11-25')).toBe(1)
  })

  it('is zero when neither today nor yesterday is covered', () => {
    expect(computeStreak(new Set(['2026-11-22']), '2026-11-25')).toBe(0)
    expect(computeStreak(new Set(), '2026-11-25')).toBe(0)
  })

  it('breaks at the first uncovered day', () => {
    const covered = new Set(['2026-11-20', '2026-11-21', '2026-11-24', '2026-11-25'])
    expect(computeStreak(covered, '2026-11-25')).toBe(2)
  })

  it('crosses month and year boundaries', () => {
    const covered = new Set(['2025-12-30', '2025-12-31', '2026-01-01'])
    expect(computeStreak(covered, '2026-01-01')).toBe(3)
  })

  it('ignores dates far in the past once a gap appears', () => {
    const covered = new Set(['2026-11-01', '2026-11-25'])
    expect(computeStreak(covered, '2026-11-25')).toBe(1)
  })
})

describe('previousDayUtc', () => {
  it('steps back one calendar day in UTC', () => {
    expect(previousDayUtc('2026-11-01')).toBe('2026-10-31')
    expect(previousDayUtc('2026-03-01')).toBe('2026-02-28')
    expect(previousDayUtc('2024-03-01')).toBe('2024-02-29')
  })
})

describe('weekStartUtc', () => {
  it('returns the Monday of the UTC week', () => {
    // 2026-11-25 is a Wednesday.
    expect(weekStartUtc('2026-11-25')).toBe('2026-11-23')
  })

  it('treats Sunday as the last day of the week (ISO)', () => {
    // 2026-11-29 is a Sunday; its week started Monday 2026-11-23.
    expect(weekStartUtc('2026-11-29')).toBe('2026-11-23')
  })

  it('returns the same day for Mondays', () => {
    expect(weekStartUtc('2026-11-23')).toBe('2026-11-23')
  })
})
