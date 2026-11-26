import type { ExerciseProgress, SessionSummary } from './types'

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

export interface VolumeDay {
  /** UTC date (YYYY-MM-DD), matching how the app displays stored timestamps. */
  date: string
  minutes: number
}

/** How many days the practice-volume chart covers. */
export const VOLUME_DAYS = 14

/** Practice minutes per day for the last `days` days, oldest first (gaps are zero). */
export function dailyVolume(sessions: SessionSummary[], days = VOLUME_DAYS): VolumeDay[] {
  const totals = new Map<string, number>()
  for (const session of sessions) {
    const date = session.startedAt.slice(0, 10)
    totals.set(date, (totals.get(date) ?? 0) + session.totalSeconds / 60)
  }
  const result: VolumeDay[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10)
    result.push({ date, minutes: Math.round(totals.get(date) ?? 0) })
  }
  return result
}
