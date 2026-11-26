import { useState } from 'react'
import type { NeckNote } from '#/lib/theory'
import { playMidiNotes } from '#/components/ear/synth'

const NOTE_SECONDS = 0.35
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Fret-window practice state for a set of neck notes: window bounds, the
 * round-trip sequence and playback with per-note highlighting. Shared by the
 * scale and arpeggio pages.
 */
export function useNeckPlayback(notes: NeckNote[]) {
  const [fromFret, setFromFret] = useState(0)
  const [toFret, setToFret] = useState(7)
  const [playing, setPlaying] = useState(false)
  const [playingIndex, setPlayingIndex] = useState(-1)
  const [error, setError] = useState('')

  // The practice window; swapped if the user enters it backwards.
  const lo = Math.min(fromFret, toFret)
  const hi = Math.max(fromFret, toFret)
  const inWindow = notes.filter((note) => note.fret >= lo && note.fret <= hi)
  // Up and back down: the way scales are actually practiced.
  const sequence = [...inWindow, ...[...inWindow].reverse().slice(1, -1)]

  async function play() {
    setError('')
    if (sequence.length === 0) return
    setPlaying(true)
    try {
      for (let i = 0; i < sequence.length; i += 1) {
        setPlayingIndex(i)
        await playMidiNotes([sequence[i].midi], { noteDuration: NOTE_SECONDS, gap: 0 })
        await sleep((NOTE_SECONDS + 0.1) * 1000)
      }
    } catch {
      setError('Audio is not available in this browser.')
    } finally {
      setPlayingIndex(-1)
      setPlaying(false)
    }
  }

  return { fromFret, toFret, setFromFret, setToFret, lo, hi, inWindow, sequence, playing, playingIndex, error, play }
}
