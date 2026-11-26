import { describe, expect, it } from 'vitest'
import { LICK_LENGTH, generateLick, lickToText, maxFretDistance } from '#/lib/lick'
import { scalePcs, scaleTypeById } from '#/lib/theory'

const input = { rootPc: 9, scaleId: 'minor-pentatonic', style: 'blues' as const, seed: 42 }

describe('generateLick', () => {
  it('is deterministic for the same seed', () => {
    expect(generateLick(input)).toEqual(generateLick(input))
  })

  it('produces a full phrase of in-scale notes', () => {
    const lick = generateLick(input)
    expect(lick.notes).toHaveLength(LICK_LENGTH)
    const pcs = new Set(scalePcs(input.rootPc, scaleTypeById(input.scaleId)!))
    for (const note of lick.notes) {
      expect(pcs.has(note.midi % 12)).toBe(true)
      expect(note.fret).toBeGreaterThanOrEqual(0)
      expect(note.fret).toBeLessThanOrEqual(9) // one hand position, five frets wide
    }
  })

  it('keeps consecutive notes within reachable fret distance', () => {
    for (const seed of [1, 7, 42, 1234, 99999]) {
      const lick = generateLick({ ...input, seed })
      expect(maxFretDistance(lick.notes)).toBeLessThanOrEqual(4)
    }
  })

  it('never puts a technique on the first note', () => {
    for (const seed of [1, 7, 42]) {
      expect(generateLick({ ...input, seed }).notes[0].technique).toBeNull()
    }
  })

  it('works for every scale type and both styles', () => {
    const ids = ['major', 'natural-minor', 'major-pentatonic', 'minor-pentatonic', 'blues', 'bebop-dominant']
    for (const scaleId of ids) {
      for (const style of ['blues', 'jazz'] as const) {
        const lick = generateLick({ rootPc: 2, scaleId, style, seed: 5 })
        expect(lick.notes).toHaveLength(LICK_LENGTH)
        expect(maxFretDistance(lick.notes)).toBeLessThanOrEqual(4)
      }
    }
  })
})

describe('lickToText', () => {
  it('includes the header and every note', () => {
    const text = lickToText(generateLick(input))
    expect(text).toContain('A Minor pentatonic')
    expect(text).toContain('blues')
    expect(text).toContain('seed 42')
    for (const note of generateLick(input).notes) {
      expect(text).toContain(note.name)
    }
  })

  it('marks techniques inline', () => {
    // Seed 42 in A minor pentatonic lands a slide on one of its notes.
    const lick = generateLick(input)
    if (lick.notes.some((note) => note.technique)) {
      expect(lickToText(lick)).toMatch(/slide|vibrato|hammer-on/)
    }
  })
})
