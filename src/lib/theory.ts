/**
 * Pure music-theory data and math: key signatures, diatonic chords and
 * chord diagrams. No I/O — the UI renders what these functions return.
 */

import { MAJOR_SCALE } from './ear'

/** Pitch class 0–11, sharp spelling (matches `NOTE_NAMES`). */
export type RootPc = number

/** Number of sharps (+) or flats (−) in each major key, by root pitch class. */
const MAJOR_KEY_SHARPS: Record<number, number> = {
  0: 0, // C
  1: -5, // Db
  2: 2, // D
  3: -3, // Eb
  4: 4, // E
  5: -1, // F
  6: 6, // F#
  7: 1, // G
  8: -4, // Ab
  9: 3, // A
  10: -2, // Bb
  11: 5, // B
}

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'] as const
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'] as const

export interface KeySignature {
  sharps: string[]
  flats: string[]
}

/** The key signature of a major key, in staff order. */
export function keySignature(rootPc: RootPc): KeySignature {
  const count = MAJOR_KEY_SHARPS[rootPc]
  if (count === 0) return { sharps: [], flats: [] }
  if (count > 0) return { sharps: SHARP_ORDER.slice(0, count), flats: [] }
  return { sharps: [], flats: FLAT_ORDER.slice(0, -count) }
}

/** The relative minor of a major key root. */
export function relativeMinor(rootPc: RootPc): RootPc {
  return (rootPc + 9) % 12
}

// --- Note spelling ------------------------------------------------------------------

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11] as const

/** Letter index for each pitch class in sharp spelling (C# not Db, …). */
const ROOT_LETTER: Record<number, number> = {
  0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5, 11: 6,
}

/**
 * Correctly spelled note names of a major scale (F# major ends in E#, not F).
 */
export function majorScaleNames(rootPc: RootPc): string[] {
  const startLetter = ROOT_LETTER[rootPc]
  return MAJOR_SCALE.map((offset, degree) => {
    const letter = (startLetter + degree) % 7
    let accidental = (rootPc + offset) % 12 - LETTER_PC[letter]
    if (accidental < -5 || accidental > 6) accidental += 12 // e.g. B# = pc 0 on letter B
    const marks = accidental > 0 ? '#'.repeat(accidental) : 'b'.repeat(-accidental)
    return LETTERS[letter] + marks
  })
}

// --- Diatonic chords ----------------------------------------------------------------

export interface DiatonicChord {
  name: string
  roman: string
  quality: string
  semitones: number[]
}

const TRIADS = [
  { roman: 'I', quality: 'Major', semitones: [0, 4, 7] },
  { roman: 'ii', quality: 'Minor', semitones: [0, 3, 7] },
  { roman: 'iii', quality: 'Minor', semitones: [0, 3, 7] },
  { roman: 'IV', quality: 'Major', semitones: [0, 4, 7] },
  { roman: 'V', quality: 'Major', semitones: [0, 4, 7] },
  { roman: 'vi', quality: 'Minor', semitones: [0, 3, 7] },
  { roman: 'vii°', quality: 'Diminished', semitones: [0, 3, 6] },
] as const

const SEVENTHS = [
  { roman: 'I', quality: 'Major 7th', semitones: [0, 4, 7, 11] },
  { roman: 'ii', quality: 'Minor 7th', semitones: [0, 3, 7, 10] },
  { roman: 'iii', quality: 'Minor 7th', semitones: [0, 3, 7, 10] },
  { roman: 'IV', quality: 'Major 7th', semitones: [0, 4, 7, 11] },
  { roman: 'V', quality: 'Dominant 7th', semitones: [0, 4, 7, 10] },
  { roman: 'vi', quality: 'Minor 7th', semitones: [0, 3, 7, 10] },
  { roman: 'vii°', quality: 'Half-diminished 7th', semitones: [0, 3, 6, 9] },
] as const

/** The seven diatonic chords of a major key, in scale-degree order. */
export function diatonicChords(rootPc: RootPc, kind: 'triad' | 'seventh'): DiatonicChord[] {
  const table = kind === 'triad' ? TRIADS : SEVENTHS
  const names = majorScaleNames(rootPc)
  return table.map((entry, degree) => ({
    name: names[degree],
    roman: entry.roman,
    quality: entry.quality,
    semitones: [...entry.semitones],
  }))
}

// --- Chord diagrams -----------------------------------------------------------------

export interface ChordDiagram {
  name: string
  /** Fret per string, low E → high e. 0 = open, null = muted. */
  frets: (number | null)[]
  /** First fret shown; 1 means the nut is visible. */
  baseFret: number
}

/** Common chords with standard fingerings. Frets are low E → high e. */
const DIAGRAMS: ChordDiagram[] = [
  { name: 'C', frets: [null, 3, 2, 0, 1, 0] },
  { name: 'D', frets: [null, null, 0, 2, 3, 2] },
  { name: 'E', frets: [0, 2, 2, 1, 0, 0] },
  { name: 'F', frets: [1, 3, 3, 2, 1, 1] },
  { name: 'G', frets: [3, 2, 0, 0, 0, 3] },
  { name: 'A', frets: [null, 0, 2, 2, 2, 0] },
  { name: 'B', frets: [null, 2, 4, 4, 4, 2] },
  { name: 'Bb', frets: [6, 8, 8, 7, 6, 6] },
  { name: 'Am', frets: [null, 0, 2, 2, 1, 0] },
  { name: 'Em', frets: [0, 2, 2, 0, 0, 0] },
  { name: 'Dm', frets: [null, null, 0, 2, 3, 1] },
  { name: 'Cm', frets: [3, 5, 5, 4, 3, 3] },
  { name: 'F#m', frets: [null, 2, 4, 4, 3, 2] },
  { name: 'C7', frets: [null, 3, 2, 3, 1, 0] },
  { name: 'D7', frets: [null, null, 0, 2, 1, 2] },
  { name: 'E7', frets: [0, 2, 0, 1, 0, 0] },
  { name: 'G7', frets: [3, 2, 0, 0, 0, 1] },
  { name: 'A7', frets: [null, 0, 2, 0, 2, 0] },
  { name: 'Em7', frets: [0, 2, 2, 0, 3, 0] },
  { name: 'Am7', frets: [null, 0, 2, 0, 1, 0] },
].map((diagram) => ({ ...diagram, baseFret: baseFretFor(diagram.frets) }))

function baseFretFor(frets: (number | null)[]): number {
  const pressed = frets.filter((fret): fret is number => fret !== null && fret > 0)
  if (pressed.length === 0) return 1
  // Lowest window of four frets that still shows every dot.
  const min = Math.min(...pressed)
  const max = Math.max(...pressed)
  return Math.max(1, Math.min(min, max - 3))
}

export const CHORD_DIAGRAMS: readonly ChordDiagram[] = DIAGRAMS

export function chordDiagram(name: string): ChordDiagram | undefined {
  return DIAGRAMS.find((diagram) => diagram.name === name)
}

const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const // high e → low E

/** A copy-paste-friendly ASCII chart, one row per string (high e first) plus a fret ruler. */
export function chordToText(diagram: ChordDiagram): string {
  const rows = [...diagram.frets].reverse().map((fret, index) => {
    const label = STRING_LABELS[index]
    const marker = fret === null ? 'x' : fret === 0 ? 'o' : '-'
    const cells = [0, 1, 2, 3].map((column) => {
      const shown = diagram.baseFret + column
      return fret === shown ? String(fret).padStart(2) : '--'
    })
    return `${label}|${marker}${cells.join('')}`
  })
  const ruler = `   | ${[0, 1, 2, 3].map((column) => String(diagram.baseFret + column).padStart(2)).join('')}`
  return [...rows, ruler].join('\n')
}
