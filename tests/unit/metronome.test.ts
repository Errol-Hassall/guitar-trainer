import { describe, expect, it } from 'vitest'
import {
  RHYTHM_PATTERNS,
  calculateTapTempo,
  clampBpm,
  clampStopAfter,
  cycleAccent,
  defaultAccents,
  effectiveClicksPerMinute,
  resizeAccents,
  subdivisionOffsets,
} from '#/lib/metronome'

describe('clampBpm', () => {
  it('clamps to the supported range', () => {
    expect(clampBpm(0)).toBe(1)
    expect(clampBpm(-50)).toBe(1)
    expect(clampBpm(1000)).toBe(999)
    expect(clampBpm(123.4)).toBe(123)
  })

  it('falls back to 90 for non-finite input', () => {
    expect(clampBpm(NaN)).toBe(90)
    expect(clampBpm(Infinity)).toBe(90)
  })
})

describe('cycleAccent', () => {
  it('cycles normal → accent → dominant → rest → normal', () => {
    expect(cycleAccent(0)).toBe(1)
    expect(cycleAccent(1)).toBe(2)
    expect(cycleAccent(2)).toBe(3)
    expect(cycleAccent(3)).toBe(0)
  })
})

describe('defaultAccents', () => {
  it('marks the first beat dominant and the rest normal', () => {
    expect(defaultAccents(4)).toEqual([2, 0, 0, 0])
    expect(defaultAccents(1)).toEqual([2])
  })
})

describe('resizeAccents', () => {
  it('trims to the beat count', () => {
    expect(resizeAccents([2, 1, 0, 2], 2)).toEqual([2, 1])
  })

  it('pads with normal beats', () => {
    expect(resizeAccents([2], 3)).toEqual([2, 0, 0])
  })
})

describe('subdivisionOffsets', () => {
  it('returns one tick per beat for "none"', () => {
    expect(subdivisionOffsets('none')).toEqual([0])
  })

  it('splits beats into the right fractions', () => {
    expect(subdivisionOffsets('eighth')).toEqual([0, 0.5])
    expect(subdivisionOffsets('sixteenth')).toEqual([0, 0.25, 0.5, 0.75])
    expect(subdivisionOffsets('gallop')).toEqual([0, 1 / 3])
    expect(subdivisionOffsets('triplet')).toEqual([0, 1 / 3, 2 / 3])
    expect(subdivisionOffsets('swing')).toEqual([0, 2 / 3])
  })
})

describe('effectiveClicksPerMinute', () => {
  it('multiplies bpm by the number of ticks per beat', () => {
    expect(effectiveClicksPerMinute(90, 'none')).toBe(90)
    expect(effectiveClicksPerMinute(90, 'eighth')).toBe(180)
    expect(effectiveClicksPerMinute(60, 'sixteenth')).toBe(240)
  })
})

describe('calculateTapTempo', () => {
  it('returns null with fewer than two taps', () => {
    expect(calculateTapTempo([])).toBeNull()
    expect(calculateTapTempo([1000])).toBeNull()
  })

  it('converts even intervals to BPM', () => {
    // One beat every 500ms → 120 BPM.
    expect(calculateTapTempo([0, 500, 1000, 1500])).toBe(120)
  })

  it('only uses the most recent six taps', () => {
    // The odd first interval (1000ms) is outside the six-tap window;
    // the remaining intervals average 500ms → 120 BPM.
    expect(calculateTapTempo([0, 1000, 1500, 2000, 2500, 3000, 3500, 4000])).toBe(120)
  })

  it('clamps the result', () => {
    expect(calculateTapTempo([0, 10])).toBe(999)
  })
})

describe('clampStopAfter', () => {
  it('clamps to whole bars in 0–999', () => {
    expect(clampStopAfter(-5)).toBe(0)
    expect(clampStopAfter(1234)).toBe(999)
    expect(clampStopAfter(2.6)).toBe(3)
  })

  it('falls back to 0 (keep playing) for non-finite input', () => {
    expect(clampStopAfter(NaN)).toBe(0)
    expect(clampStopAfter(Infinity)).toBe(0)
  })
})

describe('RHYTHM_PATTERNS', () => {
  it('waltz is 3/4 with a dominant downbeat', () => {
    const waltz = RHYTHM_PATTERNS.find((pattern) => pattern.id === 'waltz')
    expect(waltz?.beats).toBe(3)
    expect(waltz?.accents).toEqual([2, 0, 0])
    expect(waltz?.subdivision).toBe('none')
  })

  it('shuffle and gallop are mirror-image two-note-per-beat patterns', () => {
    const shuffle = RHYTHM_PATTERNS.find((pattern) => pattern.id === 'shuffle')
    const gallop = RHYTHM_PATTERNS.find((pattern) => pattern.id === 'gallop')
    expect(shuffle?.subdivision).toBe('swing') // long–short
    expect(gallop?.subdivision).toBe('gallop') // short–long
  })
})
