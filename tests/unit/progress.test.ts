import { describe, expect, it } from 'vitest'
import type { ExerciseProgress } from '#/lib/types'
import { bpmGraphPoints } from '#/lib/progress'

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
