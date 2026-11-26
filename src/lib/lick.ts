/**
 * LickLab generation: deterministic phrases from scale data. Pure — the page
 * renders what these functions return, and playback reuses the ear synth.
 */

import { NOTE_NAMES } from './ear'
import type { NeckNote } from './theory'
import { neckNotes, scaleTypeById } from './theory'

export type LickStyle = 'blues' | 'jazz'

export interface LickNote {
  name: string
  midi: number
  /** 0 = low E … 5 = high e. */
  stringIndex: number
  fret: number
  technique: 'slide' | 'vibrato' | 'hammer-on' | null
}

export interface Lick {
  rootPc: number
  scaleId: string
  style: LickStyle
  seed: number
  notes: LickNote[]
}

export const LICK_LENGTH = 8

/** Consecutive notes stay within one five-fret hand position. */
const PLAYABLE_FRET_DISTANCE = 4
const POSITION_STARTS = [0, 1, 3, 5] as const
const TECHNIQUES = ['slide', 'vibrato', 'hammer-on'] as const

/** mulberry32 — tiny deterministic PRNG so the same seed always gives the same lick. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Largest fret jump between consecutive notes. */
export function maxFretDistance(notes: readonly { fret: number }[]): number {
  let max = 0
  for (let i = 1; i < notes.length; i += 1) {
    max = Math.max(max, Math.abs(notes[i].fret - notes[i - 1].fret))
  }
  return max
}

function walk(rng: () => number, pool: NeckNote[], style: LickStyle): LickNote[] {
  const maxStep = style === 'jazz' ? 4 : 3
  const techniqueChance = style === 'blues' ? 0.35 : 0.15
  let index = Math.floor(rng() * pool.length)
  const notes: LickNote[] = []
  for (let i = 0; i < LICK_LENGTH; i += 1) {
    const note = pool[index]
    const technique =
      i > 0 && rng() < techniqueChance ? TECHNIQUES[Math.floor(rng() * TECHNIQUES.length)] : null
    notes.push({ name: note.name, midi: note.midi, stringIndex: note.stringIndex, fret: note.fret, technique })

    // Step ±1..maxStep along the pool; bounce off the edges of the position.
    const direction = rng() < 0.5 ? -1 : 1
    const step = 1 + Math.floor(rng() * maxStep)
    let next = index + direction * step
    if (next < 0 || next >= pool.length) next = index - direction * step
    index = Math.min(pool.length - 1, Math.max(0, next))
  }
  return notes
}

export function generateLick(input: {
  rootPc: number
  scaleId: string
  style: LickStyle
  seed: number
}): Lick {
  const type = scaleTypeById(input.scaleId)
  if (!type) throw new Error(`Unknown scale type: ${input.scaleId}`)
  const rng = mulberry32(input.seed)

  // Validate against the playability rule and retry on the advanced PRNG.
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const start = POSITION_STARTS[Math.floor(rng() * POSITION_STARTS.length)]
    const pool = neckNotes(input.rootPc, type, start + PLAYABLE_FRET_DISTANCE).filter(
      (note) => note.fret >= start,
    )
    if (pool.length < 2) continue
    const notes = walk(rng, pool, input.style)
    if (maxFretDistance(notes) <= PLAYABLE_FRET_DISTANCE) {
      return { rootPc: input.rootPc, scaleId: input.scaleId, style: input.style, seed: input.seed, notes }
    }
  }
  // shortcut: the window is only five frets wide, so the check above always
  // passes; this guard keeps the contract explicit.
  throw new Error('Could not generate a playable lick')
}

/** A copy-paste-friendly plain-text version of a lick. */
export function lickToText(lick: Lick): string {
  const type = scaleTypeById(lick.scaleId)
  const header = `${NOTE_NAMES[lick.rootPc]} ${type?.name ?? lick.scaleId} · ${lick.style} · seed ${lick.seed}`
  const lines = lick.notes.map((note, i) => {
    const technique = note.technique ? `, ${note.technique}` : ''
    return `${i + 1}. ${note.name} (string ${6 - note.stringIndex}, fret ${note.fret}${technique})`
  })
  return [header, ...lines].join('\n')
}
