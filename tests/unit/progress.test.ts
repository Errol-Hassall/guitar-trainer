import { describe, expect, it } from 'vitest'
import type { ExerciseProgress, SessionSummary } from '#/lib/types'
import { bpmGraphPoints, dailyVolume, VOLUME_DAYS } from '#/lib/progress'

const entry = (overrides: Partial<ExerciseProgress>): ExerciseProgress => ({
  id: 1,
  exerciseId: 1,
  sessionName: null,
  maxCleanBpm: null,
  avgBpm: null,
  durationSeconds: 0,
  cleanStreak: null,
  selfRating: null,
  notes: '',
  completedAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
})

describe('bpmGraphPoints', () => {
  it('keeps only entries with a max clean BPM', () => {
    const points = bpmGraphPoints([
      entry({ id: 1, maxCleanBpm: 100 }),
      entry({ id: 2, selfRating: 4 }),
      entry({ id: 3, avgBpm: 95 }),
    ])
    expect(points).toEqual([{ at: '2026-11-01T10:00:00.000Z', bpm: 100 }])
  })

  it('sorts oldest first regardless of input order', () => {
    const points = bpmGraphPoints([
      entry({ id: 2, maxCleanBpm: 120, completedAt: '2026-11-03T10:00:00.000Z' }),
      entry({ id: 1, maxCleanBpm: 90, completedAt: '2026-11-01T10:00:00.000Z' }),
      entry({ id: 3, maxCleanBpm: 110, completedAt: '2026-11-02T10:00:00.000Z' }),
    ])
    expect(points.map((point) => point.bpm)).toEqual([90, 110, 120])
  })

  it('returns an empty array when nothing qualifies', () => {
    expect(bpmGraphPoints([])).toEqual([])
    expect(bpmGraphPoints([entry({ selfRating: 5 })])).toEqual([])
  })
})

const session = (startedAt: string, totalSeconds: number): SessionSummary => ({
  id: 1,
  templateName: 'Daily 60',
  theme: 'Picking & Pulse',
  kind: 'full',
  status: 'completed',
  startedAt,
  completedAt: null,
  sectionCount: 3,
  completedSections: 3,
  totalSeconds,
  mood: null,
})

const isoDaysAgo = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString()

describe('dailyVolume', () => {
  it('sums minutes per day and keeps zero gaps in the window', () => {
    const volumes = dailyVolume([
      session(isoDaysAgo(0), 3600), // today: 60 min
      session(isoDaysAgo(0), 1800), // today: +30 min
      session(isoDaysAgo(2), 90), // two days ago: 1.5 min → rounds to 2
    ])
    expect(volumes).toHaveLength(VOLUME_DAYS)
    expect(volumes[volumes.length - 1]).toEqual({ date: isoDaysAgo(0).slice(0, 10), minutes: 90 })
    expect(volumes[volumes.length - 3].minutes).toBe(2)
    expect(volumes[volumes.length - 2].minutes).toBe(0) // gap day stays zero
  })

  it('is empty-window zeros with no sessions', () => {
    expect(dailyVolume([]).every((day) => day.minutes === 0)).toBe(true)
  })
})
