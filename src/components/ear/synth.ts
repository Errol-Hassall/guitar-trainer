import { midiFrequency } from '#/lib/ear'
import { unlockAudio } from '../metronome/audio'

export interface PlayNotesOptions {
  /** Seconds each note sounds. */
  noteDuration?: number
  /** Silence between notes. */
  gap?: number
  volume?: number
}

/**
 * Plays MIDI notes in sequence on the shared AudioContext (same pattern as the
 * metronome). Call `unlockAudio` from a user gesture first; browsers keep the
 * context suspended until then.
 */
export async function playMidiNotes(
  notes: number[],
  { noteDuration = 0.4, gap = 0.12, volume = 0.3 }: PlayNotesOptions = {},
): Promise<void> {
  const context = await unlockAudio()
  let time = context.currentTime + 0.05
  for (const note of notes) {
    const gain = context.createGain()
    gain.connect(context.destination)
    gain.gain.setValueAtTime(volume, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + noteDuration)

    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = midiFrequency(note)
    oscillator.connect(gain)
    oscillator.start(time)
    oscillator.stop(time + noteDuration + 0.02)
    time += noteDuration + gap
  }
}
