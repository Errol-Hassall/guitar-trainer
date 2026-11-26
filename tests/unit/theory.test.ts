import { describe, expect, it } from 'vitest'
import {
  CHORD_DIAGRAMS,
  chordDiagram,
  chordPcs,
  chordToText,
  diatonicChords,
  keySignature,
  minorDiatonicChords,
  minorKeySignature,
  neckNotes,
  relativeMinor,
  scaleNoteNames,
  scalePcs,
  scaleTypeById,
  windowNotes,
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

  it('gives minor keys the signature of their relative major', () => {
    expect(minorKeySignature(9)).toEqual({ sharps: [], flats: [] }) // A minor = C major
    expect(minorKeySignature(11).sharps).toHaveLength(2) // B minor = D major, 2 sharps
    expect(minorKeySignature(6).sharps).toEqual(['F', 'C', 'G']) // F# minor = A major, 3 sharps
    expect(minorKeySignature(2).flats).toEqual(['B']) // D minor = F major, 1 flat
    expect(minorKeySignature(10).sharps).toHaveLength(7) // A# minor = C# major, 7 sharps
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

  it('lists the natural-minor triads with lowercase i and a major III/VI/VII', () => {
    const chords = minorDiatonicChords(9) // A minor
    expect(chords.map((c) => `${c.roman} ${c.name} ${c.quality}`)).toEqual([
      'i A Minor',
      'ii° B Diminished',
      'III C Major',
      'iv D Minor',
      'v E Minor',
      'VI F Major',
      'VII G Major',
    ])
  })

  it('transposes correctly for a sharp key', () => {
    const chords = diatonicChords(6, 'triad') // F# major
    expect(chords.map((c) => c.name)).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'])
  })
})

describe('scales', () => {
  it('collects the pitch classes of a scale without duplicates', () => {
    expect(scalePcs(0, scaleTypeById('major')!)).toEqual([0, 2, 4, 5, 7, 9, 11])
    // Blues has six distinct notes.
    expect(scalePcs(0, scaleTypeById('blues')!)).toHaveLength(6)
  })

  it('spells scales with the right letters and accidental family', () => {
    const byId = (id: string) => scaleNoteNames(0, scaleTypeById(id)!)
    expect(byId('major')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(scaleNoteNames(0, scaleTypeById('blues')!)).toEqual(['C', 'Eb', 'F', 'Gb', 'G', 'Bb'])
    // Sharp-named roots keep the sharp family.
    expect(scaleNoteNames(1, scaleTypeById('minor-pentatonic')!)).toEqual([
      'C#',
      'E',
      'F#',
      'G#',
      'B',
    ])
    // Sharp-named roots spell the whole scale in sharps (A# minor pentatonic).
    expect(scaleNoteNames(10, scaleTypeById('minor-pentatonic')!)).toEqual([
      'A#',
      'C#',
      'D#',
      'F',
      'G#',
    ])
    // Diatonic majors stay consecutive letters even into E#/B# territory.
    expect(scaleNoteNames(7, scaleTypeById('major')!)).toEqual([
      'G',
      'A',
      'B',
      'C',
      'D',
      'E',
      'F#',
    ])
  })

  it('lists every scale note on the neck, low to high', () => {
    const cMajor = neckNotes(0, scaleTypeById('major')!, 7)
    // Low E string: open E, F1, G3, A5, B7.
    const lowE = cMajor.filter((note) => note.stringIndex === 0)
    expect(lowE.map((note) => note.fret)).toEqual([0, 1, 3, 5, 7])
    expect(cMajor[0].midi).toBe(40) // open low E2
    expect(cMajor.every((note, i) => i === 0 || note.midi >= cMajor[i - 1].midi)).toBe(true)
  })

  it('filters the neck to a fret window with inclusive boundaries', () => {
    const cMajor = neckNotes(0, scaleTypeById('major')!, 12)
    // Exactly fret 3: five of the six strings hold a C-major note.
    expect(windowNotes(cMajor, 3, 3)).toHaveLength(5)
    // The default practice window of C major (frets 1–7) holds 24 notes.
    expect(windowNotes(cMajor, 1, 7)).toHaveLength(24)
    // G minor pentatonic in the same window holds 17.
    const gMinorPent = neckNotes(7, scaleTypeById('minor-pentatonic')!, 12)
    expect(windowNotes(gMinorPent, 1, 7)).toHaveLength(17)
  })
})

describe('chord diagrams', () => {
  it('derives the chord tones of a diagram as ascending pitch classes', () => {
    expect(chordPcs(chordDiagram('C')!)).toEqual([0, 4, 7]) // C E G
    expect(chordPcs(chordDiagram('Am')!)).toEqual([0, 4, 9]) // A C E (G string fret 2 is an A)
    // The open C7 voicing has no G: C E Bb.
    expect(chordPcs(chordDiagram('C7')!)).toEqual([0, 4, 10])
    // Muted strings contribute no tones (D-shape on the D-G-B-e strings).
    expect(chordPcs({ name: 'X', frets: [null, null, 0, 2, 3, 2], baseFret: 1 })).toEqual([2, 6, 9])
  })

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
