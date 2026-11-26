import { describe, expect, it } from 'vitest'
import {
  CHORD_DIAGRAMS,
  chordDiagram,
  chordToText,
  diatonicChords,
  keySignature,
  relativeMinor,
} from '#/lib/theory'

describe('key signatures', () => {
  it('counts sharps and flats for every major key', () => {
    expect(keySignature(0).sharps).toEqual([]) // C
    expect(keySignature(7).sharps).toEqual(['F']) // G
    expect(keySignature(6).sharps).toEqual(['F', 'C', 'G', 'D', 'A', 'E']) // F# (6 sharps)
    expect(keySignature(5).flats).toEqual(['B']) // F
    expect(keySignature(10).flats).toEqual(['B', 'E']) // Bb
    expect(keySignature(8).flats).toEqual(['B', 'E', 'A', 'D']) // Ab (4 flats)
  })

  it('names the relative minor', () => {
    expect(relativeMinor(0)).toBe(9) // C → A
    expect(relativeMinor(6)).toBe(3) // F# → D#
    expect(relativeMinor(5)).toBe(2) // F → D
  })
})

describe('diatonic chords', () => {
  it('lists the seven triads of C major with qualities and Roman numerals', () => {
    const chords = diatonicChords(0, 'triad')
    expect(chords.map((c) => `${c.roman} ${c.name} ${c.quality}`)).toEqual([
      'I C Major',
      'ii D Minor',
      'iii E Minor',
      'IV F Major',
      'V G Major',
      'vi A Minor',
      'vii° B Diminished',
    ])
  })

  it('lists sevenths with the dominant as a dominant 7th', () => {
    const chords = diatonicChords(0, 'seventh')
    expect(chords[0]).toMatchObject({ roman: 'I', quality: 'Major 7th', semitones: [0, 4, 7, 11] })
    expect(chords[4]).toMatchObject({ roman: 'V', quality: 'Dominant 7th', semitones: [0, 4, 7, 10] })
    expect(chords[1]).toMatchObject({ roman: 'ii', quality: 'Minor 7th', semitones: [0, 3, 7, 10] })
  })

  it('transposes correctly for a sharp key', () => {
    const chords = diatonicChords(6, 'triad') // F# major
    expect(chords.map((c) => c.name)).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'])
  })
})

describe('chord diagrams', () => {
  it('has a diagram for every common chord, each with six strings in range', () => {
    expect(CHORD_DIAGRAMS.length).toBeGreaterThanOrEqual(15)
    for (const diagram of CHORD_DIAGRAMS) {
      expect(diagram.frets).toHaveLength(6)
      for (const fret of diagram.frets) {
        if (fret !== null) expect(fret).toBeGreaterThanOrEqual(0)
      }
      expect(diagram.baseFret).toBeGreaterThanOrEqual(1)
    }
  })

  it('looks chords up by name and misses cleanly', () => {
    expect(chordDiagram('C')?.frets).toEqual([null, 3, 2, 0, 1, 0]) // low E → high e
    expect(chordDiagram('F#m')).toBeDefined()
    expect(chordDiagram('Zz9')).toBeUndefined()
  })

  it('places barre chords on a base fret that keeps them in view', () => {
    const flat = chordDiagram('Bb')!
    expect(flat.baseFret).toBe(5) // shows frets 5–8, chord spans 6–8
    expect(chordDiagram('C')!.baseFret).toBe(1) // nut visible
  })

  it('renders a copyable ASCII chart', () => {
    const text = chordToText(chordDiagram('C')!)
    const lines = text.split('\n')
    expect(lines[0]).toBe('e|o--------')
    expect(lines[1]).toBe('B|- 1------')
    expect(lines[3]).toBe('D|--- 2----') // D string, fret 2
    expect(lines[4]).toBe('A|----- 3--') // A string, fret 3
    expect(lines[5]).toBe('E|x--------') // low E muted
    expect(lines[6]).toBe('   |  1 2 3 4')
  })
})
