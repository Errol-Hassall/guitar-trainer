import { describe, expect, it } from 'vitest'
import {
  CHORD_QUALITY_LEVELS,
  INTERVALS,
  MAJOR_SCALE,
  NOTE_NAMES,
  PROGRESSIONS,
  SOLFEGE,
  makePhrase,
  makeQuestion,
  midiFrequency,
  midiName,
} from '#/lib/ear'
import { keySignature, OPEN_STRINGS } from '#/lib/theory'

/** Deterministic RNG so question generation is testable. */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('midiName', () => {
  it('names notes with sharps and octave numbers', () => {
    expect(midiName(48)).toBe('C3')
    expect(midiName(60)).toBe('C4')
    expect(midiName(61)).toBe('C#4')
    expect(midiName(69)).toBe('A4')
  })
})

describe('midiFrequency', () => {
  it('is 440Hz at A4 and doubles per octave', () => {
    expect(midiFrequency(69)).toBeCloseTo(440, 3)
    expect(midiFrequency(81)).toBeCloseTo(880, 2)
    expect(midiFrequency(57)).toBeCloseTo(220, 3)
  })
})

describe('makeQuestion', () => {
  it('generates interval questions from the fixed set of ten', () => {
    const question = makeQuestion('intervals', 1, mulberry32(7))
    expect(question.options).toHaveLength(INTERVALS.length)
    expect(question.answerIndex).toBeGreaterThanOrEqual(0)
    expect(question.answerIndex).toBeLessThan(question.options.length)
    // The correct option is one of the canonical interval names.
    expect(INTERVALS.map((interval) => interval.name)).toContain(
      question.options[question.answerIndex],
    )
    // Two notes, separated by a real interval from the set.
    expect(question.notes).toHaveLength(2)
    const gap = question.notes[1] - question.notes[0]
    expect(INTERVALS.map((interval) => interval.semitones)).toContain(gap)
  })

  it('is deterministic for a given seed', () => {
    const a = makeQuestion('intervals', 1, mulberry32(42))
    const b = makeQuestion('intervals', 1, mulberry32(42))
    expect(a).toEqual(b)
  })

  it('generates scale-degree questions over the major scale', () => {
    const question = makeQuestion('scale-degrees', 1, mulberry32(3))
    // All seven degrees are offered, labelled "n Solfège".
    expect([...question.options].sort()).toEqual(
      SOLFEGE.map((name, index) => `${index + 1} ${name}`).sort(),
    )
    // Tonic first, then the target degree: the gap is a major-scale step.
    const gap = question.notes[1] - question.notes[0]
    expect(MAJOR_SCALE).toContain(gap)
  })

  it('keeps chord-quality level 1 to major/minor and adds sevenths at level 2', () => {
    const easy = makeQuestion('chord-quality', 1, mulberry32(5))
    expect(easy.options.sort()).toEqual(['Major', 'Minor'])
    expect(easy.notes).toHaveLength(3)

    const hard = makeQuestion('chord-quality', 2, mulberry32(5))
    expect(hard.options).toHaveLength(CHORD_QUALITY_LEVELS[2].length)
    expect(hard.options).toContain('Dominant 7th')
    // Triads are 3 notes, sevenths are 4.
    expect([3, 4]).toContain(hard.notes.length)
  })

  it('generates progression questions as nine diatonic notes', () => {
    const question = makeQuestion('progressions', 1, mulberry32(9))
    expect(question.options).toHaveLength(PROGRESSIONS.length)
    expect(question.notes).toHaveLength(9)
    // Recover the key root from the answered progression; every chord root
    // must sit on that key's major scale.
    const answeredName = question.options[question.answerIndex]
    const progression = PROGRESSIONS.find((item) => item.name === answeredName)!
    const keyRoot = question.notes[0] - MAJOR_SCALE[progression.degrees[0] - 1]
    for (let chord = 0; chord < 3; chord += 1) {
      expect(MAJOR_SCALE).toContain(question.notes[chord * 3] - keyRoot)
    }
  })

  it('generates text-only theory questions with four distinct options', () => {
    for (let seed = 1; seed < 20; seed += 1) {
      const question = makeQuestion('theory', 1, mulberry32(seed))
      expect(question.notes).toEqual([])
      expect(question.prompt).toBeTruthy()
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options).size).toBe(4)
      expect(question.answerIndex).toBeGreaterThanOrEqual(0)
      expect(question.answerIndex).toBeLessThan(4)
    }
  })

  it('is deterministic for a given seed (theory)', () => {
    const a = makeQuestion('theory', 1, mulberry32(42))
    const b = makeQuestion('theory', 1, mulberry32(42))
    expect(a).toEqual(b)
  })

  it('answers every theory question type correctly', () => {
    for (let seed = 1; seed < 80; seed += 1) {
      const question = makeQuestion('theory', 1, mulberry32(seed))
      const prompt = question.prompt!
      const answer = question.options[question.answerIndex]
      if (prompt.startsWith('Which note is on string')) {
        const [, stringNumber, fret] = /string (\d+), fret (\d+)/.exec(prompt)!.map(Number)
        expect(answer).toBe(NOTE_NAMES[(OPEN_STRINGS[stringNumber - 1] + fret) % 12])
      } else if (prompt.startsWith('How many sharps or flats')) {
        const rootName = /of (.+) major\?$/.exec(prompt)![1]
        const signature = keySignature((NOTE_NAMES as readonly string[]).indexOf(rootName))
        expect(answer).toBe(String(signature.sharps.length + signature.flats.length))
      } else if (prompt.startsWith('How many semitones')) {
        const name = /in a (.+)\?/.exec(prompt)![1]
        expect(answer).toBe(
          String(INTERVALS.find((interval) => interval.name === name)!.semitones),
        )
      } else {
        throw new Error(`Unknown theory prompt: ${prompt}`)
      }
    }
  })
})

describe('makePhrase', () => {
  it('returns 2–4 stepwise notes', () => {
    for (let seed = 1; seed < 20; seed += 1) {
      const phrase = makePhrase(mulberry32(seed))
      expect(phrase.length).toBeGreaterThanOrEqual(2)
      expect(phrase.length).toBeLessThanOrEqual(4)
      for (let index = 1; index < phrase.length; index += 1) {
        const step = Math.abs(phrase[index] - phrase[index - 1])
        // One or two scale steps at a time: never more than four semitones.
        expect(step).toBeGreaterThanOrEqual(1)
        expect(step).toBeLessThanOrEqual(4)
      }
    }
  })

  it('honours an explicit length', () => {
    const phrase = makePhrase(mulberry32(11), 2)
    expect(phrase).toHaveLength(2)
  })
})

describe('theory tables', () => {
  it('covers the ten standard intervals without duplicates', () => {
    const semitones = INTERVALS.map((interval) => interval.semitones)
    expect(new Set(semitones).size).toBe(10)
    expect(semitones).toEqual([...semitones].sort((a, b) => a - b))
  })

  it('labels the seven major-scale degrees in order', () => {
    expect(SOLFEGE).toHaveLength(7)
    expect(MAJOR_SCALE[MAJOR_SCALE.length - 1]).toBeLessThan(12)
  })
})
