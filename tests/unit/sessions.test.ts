import { describe, expect, it } from 'vitest'
import type { SessionSection } from '#/lib/types'
import {
  firstIncompleteIndex,
  formatClock,
  formatDuration,
  formatUtcDateTime,
  plannedSeconds,
  sessionKindLabel,
  sumElapsedSeconds,
  themeForWeekday,
  totalMinutes,
} from '#/lib/sessions'

describe('themeForWeekday', () => {
  it('maps each UTC weekday to its weekly theme', () => {
    // 2026-11-23 is a Monday.
    const monday = new Date('2026-11-23T12:00:00Z')
    expect(themeForWeekday(monday)).toBe('Picking & Pulse')
    expect(themeForWeekday(new Date('2026-11-24T12:00:00Z'))).toBe('Legato & Groove')
    expect(themeForWeekday(new Date('2026-11-25T12:00:00Z'))).toBe('Chords & Subdivision')
    expect(themeForWeekday(new Date('2026-11-26T12:00:00Z'))).toBe('Accuracy & Transcription')
    expect(themeForWeekday(new Date('2026-11-27T12:00:00Z'))).toBe('Expression & Progressions')
    expect(themeForWeekday(new Date('2026-11-28T12:00:00Z'))).toBe('Integration & Play')
    expect(themeForWeekday(new Date('2026-11-29T12:00:00Z'))).toBe('Light & Reflective')
  })

  it('uses UTC, not the local timezone', () => {
    // 2026-11-25T23:30Z is still Wednesday in UTC.
    expect(themeForWeekday(new Date('2026-11-25T23:30:00Z'))).toBe('Chords & Subdivision')
  })
})

describe('plannedSeconds', () => {
  it('keeps full sessions at the planned duration', () => {
    expect(plannedSeconds(5, 'full')).toBe(300)
  })

  it('halves light sessions and never drops below one minute', () => {
    expect(plannedSeconds(10, 'light')).toBe(300)
    expect(plannedSeconds(5, 'light')).toBe(150)
    expect(plannedSeconds(1, 'light')).toBe(60)
  })
})

describe('totalMinutes', () => {
  it('sums section minutes', () => {
    expect(
      totalMinutes([
        { id: 1, position: 0, name: 'a', minutes: 5 },
        { id: 2, position: 1, name: 'b', minutes: 12 },
      ]),
    ).toBe(17)
  })
})

describe('formatClock', () => {
  it('formats minutes and seconds', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(300)).toBe('5:00')
  })

  it('adds hours when needed', () => {
    expect(formatClock(3671)).toBe('1:01:11')
  })
})

describe('formatDuration', () => {
  it('handles zero and sub-minute totals', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(29)).toBe('<1 min')
  })

  it('formats minutes, hours and mixed totals', () => {
    expect(formatDuration(60)).toBe('1 min')
    expect(formatDuration(3900)).toBe('1 hr 5 min')
    expect(formatDuration(7200)).toBe('2 hr')
  })
})

describe('formatUtcDateTime', () => {
  it('formats in UTC with a fixed shape', () => {
    expect(formatUtcDateTime('2026-11-25T09:05:00.000Z')).toBe('25 Nov 2026, 09:05')
  })

  it('reports unparseable dates', () => {
    expect(formatUtcDateTime('not a date')).toBe('Unknown time')
  })
})

describe('firstIncompleteIndex', () => {
  const section = (completedAt: string | null): SessionSection => ({
    id: 1,
    position: 0,
    name: 's',
    plannedSeconds: 60,
    elapsedSeconds: 0,
    notes: '',
    completedAt,
  })

  it('finds the first incomplete section', () => {
    expect(firstIncompleteIndex([section(null), section('x')])).toBe(0)
    expect(firstIncompleteIndex([section('x'), section(null)])).toBe(1)
  })

  it('returns -1 when everything is done', () => {
    expect(firstIncompleteIndex([section('x'), section('y')])).toBe(-1)
    expect(firstIncompleteIndex([])).toBe(-1)
  })
})

describe('sumElapsedSeconds', () => {
  it('adds up elapsed time', () => {
    const section = (elapsed: number): SessionSection => ({
      id: 1,
      position: 0,
      name: 's',
      plannedSeconds: 60,
      elapsedSeconds: elapsed,
      notes: '',
      completedAt: null,
    })
    expect(sumElapsedSeconds([section(30), section(45)])).toBe(75)
    expect(sumElapsedSeconds([])).toBe(0)
  })
})

describe('sessionKindLabel', () => {
  it('labels each kind', () => {
    expect(sessionKindLabel('full')).toBe('Full session')
    expect(sessionKindLabel('light')).toBe('Light session')
    expect(sessionKindLabel('rest')).toBe('Rest day')
  })
})
