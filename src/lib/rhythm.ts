export interface RhythmScore {
  hits: number
  /** Percentage of taps inside the on-beat window, one decimal place. */
  onBeatPct: number
  /** Signed mean offset in ms; positive = late. */
  averageMs: number
  /** Standard deviation of the offsets in ms (lower = steadier). */
  consistencyMs: number
  advice: string
}

/** On-beat window: 10% of the beat length, capped at ±50 ms. */
export function onBeatWindowMs(bpm: number): number {
  return Math.min(50, 6000 / bpm)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Score a run of tap offsets (signed ms from the nearest beat). Pure and
 * deterministic — the trainer page supplies the offsets, this decides what
 * they mean.
 */
export function scoreTaps(offsetsMs: number[], bpm: number): RhythmScore {
  const hits = offsetsMs.length
  if (hits === 0) {
    return {
      hits: 0,
      onBeatPct: 0,
      averageMs: 0,
      consistencyMs: 0,
      advice: 'Keep tapping — a few more beats for a score.',
    }
  }

  const window = onBeatWindowMs(bpm)
  const onBeat = offsetsMs.filter((offset) => Math.abs(offset) <= window).length
  const averageMs = offsetsMs.reduce((sum, offset) => sum + offset, 0) / hits
  const variance =
    offsetsMs.reduce((sum, offset) => sum + (offset - averageMs) ** 2, 0) / hits
  const consistencyMs = Math.sqrt(variance)

  let advice: string
  if (hits < 4) {
    advice = 'Keep tapping — a few more beats for a score.'
  } else if (Math.abs(averageMs) >= 25) {
    advice =
      averageMs > 0
        ? 'You are consistently late — aim slightly ahead of the click.'
        : 'You are consistently early — let the click land before you tap.'
  } else if (consistencyMs > 30) {
    advice = 'Average is right but not steady yet — drop the BPM and focus on steadiness.'
  } else if ((onBeat / hits) * 100 < 80) {
    advice = 'Getting there — stay at this tempo and chase the click.'
  } else {
    advice = 'Locked in — try raising the BPM.'
  }

  return {
    hits,
    onBeatPct: round1((onBeat / hits) * 100),
    averageMs: round1(averageMs),
    consistencyMs: round1(consistencyMs),
    advice,
  }
}
