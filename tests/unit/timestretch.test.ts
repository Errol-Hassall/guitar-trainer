import { describe, expect, it } from 'vitest'
import { playbackRateFor, stretchFactorFor, timeStretch } from '#/lib/timestretch'

const SAMPLE_RATE = 48_000

function sine(frequency: number, seconds: number): Float32Array {
  const length = Math.floor(seconds * SAMPLE_RATE)
  const out = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    out[i] = Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE)
  }
  return out
}

describe('timeStretch (WSOLA)', () => {
  const input = sine(220, 4)

  it('produces output of roughly factor × input length', () => {
    for (const factor of [0.5, 1.5]) {
      const out = timeStretch(input, SAMPLE_RATE, factor)
      expect(out.length).toBeGreaterThan(input.length * factor * 0.9)
      expect(out.length).toBeLessThan(input.length * factor * 1.1)
    }
  })

  it('keeps pitch: a stretched sine still lines up with the original period', () => {
    const out = timeStretch(input, SAMPLE_RATE, 0.5)
    const reference = sine(220, 1)
    let bestLag = 0
    let best = -Infinity
    for (let lag = 0; lag < 64; lag += 1) {
      let acc = 0
      for (let i = 0; i < reference.length; i += 1) {
        acc += reference[i] * out[lag + i]
      }
      if (acc > best) {
        best = acc
        bestLag = lag
      }
    }
    // A few samples of initial phase offset is fine; a period error would smear
    // the peak across the whole second.
    expect(bestLag).toBeLessThanOrEqual(8)
  })

  it('reconstructs a factor-1 signal closely', () => {
    const out = timeStretch(input, SAMPLE_RATE, 1)
    const length = Math.min(input.length, out.length) - 2400 // skip windowed edges
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 2400; i < length + 2400; i += 1) {
      dot += input[i] * out[i]
      normA += input[i] * input[i]
      normB += out[i] * out[i]
    }
    const correlation = dot / Math.sqrt(normA * normB)
    expect(correlation).toBeGreaterThan(0.9)
  })

  it('keeps silence silent and stays finite', () => {
    const silence = new Float32Array(48_000)
    const out = timeStretch(silence, SAMPLE_RATE, 1.5)
    for (const value of out) {
      expect(Number.isFinite(value)).toBe(true)
      expect(Math.abs(value)).toBeLessThan(1e-6)
    }
  })

  it('never amplifies beyond the input level', () => {
    const out = timeStretch(input, SAMPLE_RATE, 0.5)
    let max = 0
    for (const value of out) max = Math.max(max, Math.abs(value))
    expect(max).toBeLessThanOrEqual(1.01)
  })
})

describe('tempo/pitch composition', () => {
  it('playbackRateFor maps semitones to a frequency ratio', () => {
    expect(playbackRateFor(0)).toBeCloseTo(1, 6)
    expect(playbackRateFor(12)).toBeCloseTo(2, 6)
    expect(playbackRateFor(-12)).toBeCloseTo(0.5, 6)
  })

  it('stretchFactorFor keeps tempo and pitch independent', () => {
    // Tempo 0.8× with +3 semitones: stretch by P/T, play at rate P.
    const tempo = 0.8
    const semitones = 3
    const factor = stretchFactorFor(tempo, semitones)
    expect(factor).toBeCloseTo(playbackRateFor(semitones) / tempo, 6)
    // Net duration: inLen × factor ÷ rate = inLen ÷ tempo.
    const netDuration = 100 * factor / playbackRateFor(semitones)
    expect(netDuration).toBeCloseTo(100 / tempo, 4)
  })
})
