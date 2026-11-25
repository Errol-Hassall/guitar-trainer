import { describe, expect, it } from 'vitest'
import { computePeaks, detectPitch, frequencyToNote } from '#/lib/audio'

const SAMPLE_RATE = 48_000

function sine(frequency: number, seconds: number): Float32Array {
  const length = Math.floor(seconds * SAMPLE_RATE)
  const out = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    out[i] = Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE)
  }
  return out
}

function noisySine(frequency: number, seconds: number, noise: number): Float32Array {
  const clean = sine(frequency, seconds)
  for (let i = 0; i < clean.length; i += 1) {
    clean[i] += (Math.random() * 2 - 1) * noise
  }
  return clean
}

describe('computePeaks', () => {
  it('returns one value per bucket, all zero for silence', () => {
    const peaks = computePeaks(new Float32Array(48_000), 50)
    expect(peaks).toHaveLength(50)
    for (const value of peaks) expect(value).toBe(0)
  })

  it('normalises a full-scale sine to roughly 1 everywhere', () => {
    const peaks = computePeaks(sine(220, 1), 40)
    // Skip the first/last bucket (partial windowing).
    for (let i = 1; i < 39; i += 1) {
      expect(peaks[i]).toBeGreaterThan(0.85)
      expect(peaks[i]).toBeLessThanOrEqual(1.0001)
    }
  })

  it('reports a quiet passage as smaller than a loud one', () => {
    const mixed = sine(220, 1)
    for (let i = 0; i < mixed.length / 2; i += 1) mixed[i] *= 0.1
    const peaks = computePeaks(mixed, 4)
    expect(peaks[0]).toBeLessThan(peaks[2])
  })
})

describe('detectPitch', () => {
  it('finds a clear A4 within 1%', () => {
    const frequency = detectPitch(sine(440, 0.05), SAMPLE_RATE)
    expect(frequency).not.toBeNull()
    expect(Math.abs(frequency! - 440) / 440).toBeLessThan(0.01)
  })

  it('finds low E2 within 3%', () => {
    const frequency = detectPitch(sine(82.41, 0.09), SAMPLE_RATE)
    expect(frequency).not.toBeNull()
    expect(Math.abs(frequency! - 82.41) / 82.41).toBeLessThan(0.03)
  })

  it('tolerates light background noise', () => {
    const frequency = detectPitch(noisySine(440, 0.05, 0.05), SAMPLE_RATE)
    expect(frequency).not.toBeNull()
    expect(Math.abs(frequency! - 440) / 440).toBeLessThan(0.02)
  })

  it('returns null for silence', () => {
    expect(detectPitch(new Float32Array(SAMPLE_RATE / 20), SAMPLE_RATE)).toBeNull()
  })

  it('returns null below the guitar range (50 Hz)', () => {
    expect(detectPitch(sine(50, 0.1), SAMPLE_RATE)).toBeNull()
  })
})

describe('frequencyToNote', () => {
  it('maps A4 exactly', () => {
    const note = frequencyToNote(440)
    expect(note?.name).toBe('A')
    expect(note?.octave).toBe(4)
    expect(Math.abs(note?.cents ?? 99)).toBeLessThan(1)
  })

  it('maps A3 and E2 with correct octaves', () => {
    expect(frequencyToNote(220)?.name).toBe('A')
    expect(frequencyToNote(220)?.octave).toBe(3)
    const lowE = frequencyToNote(82.41)
    expect(lowE?.name).toBe('E')
    expect(lowE?.octave).toBe(2)
    expect(Math.abs(lowE?.cents ?? 99)).toBeLessThan(5)
  })

  it('reports cents between notes', () => {
    const note = frequencyToNote(448) // ~31 cents above A4
    expect(note?.name).toBe('A')
    expect(note?.octave).toBe(4)
    expect(note?.cents).toBeGreaterThan(29)
    expect(note?.cents).toBeLessThan(33)
  })
})
