import type { ExerciseProgress } from './types'

export interface BpmGraphPoint {
  at: string
  bpm: number
}

/** Max clean BPM per log, oldest first. Untimed and null entries are excluded. */
export function bpmGraphPoints(progress: ExerciseProgress[]): BpmGraphPoint[] {
  return progress
    .filter((entry) => entry.maxCleanBpm !== null)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .map((entry) => ({ at: entry.completedAt, bpm: entry.maxCleanBpm as number }))
}
