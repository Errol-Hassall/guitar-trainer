import { describe, expect, it } from 'vitest'
import { suggestFocus } from '#/lib/focus'

describe('suggestFocus', () => {
  it('leads with due-for-review exercises and names the first one', () => {
    const line = suggestFocus({
      dueCount: 3,
      topDueNames: ['Picking drill', 'Chord shape'],
      streakCount: 2,
      practicedDaysThisWeek: 1,
      theme: 'Alternate picking',
    })
    expect(line).toContain('3')
    expect(line).toContain('Picking drill')
  })

  it('handles a single due exercise without pluralising', () => {
    const line = suggestFocus({
      dueCount: 1,
      topDueNames: ['Legato slurs'],
      streakCount: 0,
      practicedDaysThisWeek: 2,
      theme: 'Legato',
    })
    expect(line).toContain('1 exercise')
    expect(line).not.toContain('1 exercises')
  })

  it('suggests a light restart when the week has no practice yet', () => {
    const line = suggestFocus({
      dueCount: 0,
      topDueNames: [],
      streakCount: 0,
      practicedDaysThisWeek: 0,
      theme: 'Legato',
    })
    expect(line).toMatch(/light/i)
  })

  it('encourages a running streak and names the theme', () => {
    const line = suggestFocus({
      dueCount: 0,
      topDueNames: [],
      streakCount: 5,
      practicedDaysThisWeek: 3,
      theme: 'Alternate picking',
    })
    expect(line).toContain('5')
    expect(line).toContain('Alternate picking')
  })

  it('falls back to the day’s theme otherwise', () => {
    const line = suggestFocus({
      dueCount: 0,
      topDueNames: [],
      streakCount: 1,
      practicedDaysThisWeek: 1,
      theme: 'Clean technique',
    })
    expect(line).toContain('Clean technique')
  })
})
