/**
 * Pure ear-training logic: note math, drill tables and question generation.
 * No I/O — the UI synthesizes audio from the returned MIDI numbers.
 */

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

/** "C4" for MIDI 60; octave numbers follow the piano convention (MIDI 12 = C0). */
export function midiName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
}

export function midiFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

// --- Drills ---------------------------------------------------------------------

export const EAR_DRILLS = [
  {
    id: 'intervals',
    name: 'Intervals',
    description: 'Two notes, one gap. Name the interval.',
  },
  {
    id: 'scale-degrees',
    name: 'Scale degrees',
    description: 'Tonic first, then a note from the major scale. Which degree?',
  },
  {
    id: 'chord-quality',
    name: 'Chord quality',
    description: 'A chord played note by note. Level 1: major vs minor. Level 2 adds sevenths.',
  },
  {
    id: 'progressions',
    name: 'Progressions',
    description: 'Three chords in a key. Which progression is it?',
  },
  {
    id: 'transcription',
    name: 'Transcription',
    description: 'Sing the phrase first, then find it on the guitar. Record a take if you like.',
  },
] as const

export type EarDrillId = (typeof EAR_DRILLS)[number]['id']

/** Literal-typed so `z.enum` keeps the union in inferred server-fn inputs. */
export const EAR_DRILL_IDS = EAR_DRILLS.map((drill) => drill.id) as readonly EarDrillId[]

/** Prompts per scored round. */
export const ROUND_LENGTH = 10

// --- Theory tables ----------------------------------------------------------------

export const INTERVALS = [
  { semitones: 2, name: 'Major 2nd' },
  { semitones: 3, name: 'Minor 3rd' },
  { semitones: 5, name: 'Perfect 4th' },
  { semitones: 6, name: 'Tritone' },
  { semitones: 7, name: 'Perfect 5th' },
  { semitones: 8, name: 'Minor 6th' },
  { semitones: 9, name: 'Major 6th' },
  { semitones: 10, name: 'Minor 7th' },
  { semitones: 11, name: 'Major 7th' },
  { semitones: 12, name: 'Octave' },
] as const

/** Major scale, in semitones from the tonic. */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11] as const

export const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'] as const

export interface ChordQuality {
  name: string
  semitones: number[]
}

/** Level 1 is major/minor; level 2 adds the three common sevenths. */
export const CHORD_QUALITY_LEVELS: Record<1 | 2, readonly ChordQuality[]> = {
  1: [
    { name: 'Major', semitones: [0, 4, 7] },
    { name: 'Minor', semitones: [0, 3, 7] },
  ],
  2: [
    { name: 'Major', semitones: [0, 4, 7] },
    { name: 'Minor', semitones: [0, 3, 7] },
    { name: 'Major 7th', semitones: [0, 4, 7, 11] },
    { name: 'Minor 7th', semitones: [0, 3, 7, 10] },
    { name: 'Dominant 7th', semitones: [0, 4, 7, 10] },
  ],
}

/** Common three-chord progressions; degrees are 1-based scale degrees. */
export const PROGRESSIONS = [
  { name: 'I–IV–V', degrees: [1, 4, 5] },
  { name: 'I–V–vi', degrees: [1, 5, 6] },
  { name: 'vi–IV–I', degrees: [6, 4, 1] },
  { name: 'ii–V–I', degrees: [2, 5, 1] },
] as const

// --- Question generation ------------------------------------------------------------

export interface EarQuestion {
  drill: EarDrillId
  level: number
  /** Shuffled answer labels; `answerIndex` points at the right one. */
  options: string[]
  answerIndex: number
  /** MIDI numbers to play, in order. */
  notes: number[]
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

/** A random root in a singable, guitar-friendly range. */
function randomRoot(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1))
}

function makeIntervalQuestion(random: () => number): EarQuestion {
  const root = randomRoot(48, 72, random) // C3–C5
  const interval = pick(INTERVALS, random)
  const options = shuffled(INTERVALS.map((item) => item.name), random)
  return {
    drill: 'intervals',
    level: 1,
    options,
    answerIndex: options.indexOf(interval.name),
    notes: [root, root + interval.semitones],
  }
}

function makeScaleDegreeQuestion(random: () => number): EarQuestion {
  const root = randomRoot(48, 72, random)
  const degree = Math.floor(random() * MAJOR_SCALE.length) // 0-based index
  const labels = SOLFEGE.map((name, index) => `${index + 1} ${name}`)
  const options = shuffled(labels, random)
  return {
    drill: 'scale-degrees',
    level: 1,
    options,
    answerIndex: options.indexOf(labels[degree]),
    notes: [root, root + MAJOR_SCALE[degree]],
  }
}

function makeChordQualityQuestion(level: 1 | 2, random: () => number): EarQuestion {
  const root = randomRoot(48, 60, random) // C3–C4
  const quality = pick(CHORD_QUALITY_LEVELS[level], random)
  const options = shuffled(
    CHORD_QUALITY_LEVELS[level].map((item) => item.name),
    random,
  )
  return {
    drill: 'chord-quality',
    level,
    options,
    answerIndex: options.indexOf(quality.name),
    notes: quality.semitones.map((offset) => root + offset),
  }
}

function makeProgressionQuestion(random: () => number): EarQuestion {
  const keyRoot = randomRoot(48, 60, random)
  const progression = pick(PROGRESSIONS, random)
  const options = shuffled(PROGRESSIONS.map((item) => item.name), random)
  const notes: number[] = []
  for (const degree of progression.degrees) {
    const chordRoot = keyRoot + MAJOR_SCALE[degree - 1]
    // Diatonic triads: major on I/IV/V, minor on ii/iii/vi.
    const third = [1, 4, 5].includes(degree) ? 4 : 3
    notes.push(chordRoot, chordRoot + third, chordRoot + 7)
  }
  return {
    drill: 'progressions',
    level: 1,
    options,
    answerIndex: options.indexOf(progression.name),
    notes,
  }
}

export function makeQuestion(
  drill: EarDrillId,
  level = 1,
  random: () => number = Math.random,
): EarQuestion {
  switch (drill) {
    case 'intervals':
      return makeIntervalQuestion(random)
    case 'scale-degrees':
      return makeScaleDegreeQuestion(random)
    case 'chord-quality':
      return makeChordQualityQuestion(level === 2 ? 2 : 1, random)
    case 'progressions':
      return makeProgressionQuestion(random)
    default:
      throw new Error(`No quiz questions for drill "${drill}"`)
  }
}

/**
 * A singable phrase of 2–4 stepwise notes (one or two scale steps at a time),
 * used by the transcription helper.
 */
export function makePhrase(random: () => number = Math.random, length?: number): number[] {
  const count = length ?? 2 + Math.floor(random() * 3) // 2–4
  const tonic = randomRoot(55, 62, random) // A3–G4
  let position = Math.floor(random() * MAJOR_SCALE.length)
  const notes = [tonic + MAJOR_SCALE[position]]
  for (let index = 1; index < count; index += 1) {
    const step = pick([-2, -1, 1, 2], random)
    // Reflect at the scale edges so consecutive notes always differ.
    let next = position + step
    if (next < 0 || next >= MAJOR_SCALE.length) next = position - step
    position = next
    notes.push(tonic + MAJOR_SCALE[position])
  }
  return notes
}
