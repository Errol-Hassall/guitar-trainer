import type { AccentLevel, Subdivision } from '#/lib/types'

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return 90
  return Math.min(999, Math.max(1, Math.round(value)))
}

export function cycleAccent(level: AccentLevel): AccentLevel {
  return ((level + 1) % 3) as AccentLevel
}

export function defaultAccents(beats: number): AccentLevel[] {
  return Array.from({ length: beats }, (_, index) => (index === 0 ? 2 : 0))
}

export function resizeAccents(
  accents: AccentLevel[],
  beats: number,
): AccentLevel[] {
  const next = accents.slice(0, beats)
  while (next.length < beats) next.push(0)
  return next
}

export function subdivisionOffsets(subdivision: Subdivision): number[] {
  switch (subdivision) {
    case 'none':
      return [0]
    case 'eighth':
      return [0, 0.5]
    case 'sixteenth':
      return [0, 0.25, 0.5, 0.75]
    case 'triplet':
      return [0, 1 / 3, 2 / 3]
    case 'swing':
      return [0, 2 / 3]
  }
}

export function effectiveClicksPerMinute(
  bpm: number,
  subdivision: Subdivision,
): number {
  return Math.round(bpm * subdivisionOffsets(subdivision).length)
}

/**
 * Converts tap timestamps (milliseconds, oldest first) into BPM.
 * Callers reset the list when the user pauses for more than two seconds.
 */
export function calculateTapTempo(taps: number[]): number | null {
  if (taps.length < 2) return null

  const recent = taps.slice(-6)
  const intervals: number[] = []
  for (let index = 1; index < recent.length; index += 1) {
    const interval = recent[index] - recent[index - 1]
    if (interval > 0) intervals.push(interval)
  }
  if (intervals.length === 0) return null

  const average =
    intervals.reduce((total, interval) => total + interval, 0) / intervals.length
  return clampBpm(60_000 / average)
}
