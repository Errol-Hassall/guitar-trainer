import type { ClickSound } from '#/lib/types'

export type ClickKind = 'dominant' | 'accent' | 'normal' | 'subdivision'

let sharedContext: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new AudioContext()
  }
  return sharedContext
}

export async function unlockAudio(): Promise<AudioContext> {
  const context = getAudioContext()
  if (context.state === 'suspended') {
    await context.resume().catch(() => undefined)
  }
  return context
}

const FREQUENCIES: Record<
  ClickKind,
  Record<ClickSound, number>
> = {
  dominant: { woodblock: 1250, beep: 880, cowbell: 1120, click: 1900 },
  accent: { woodblock: 940, beep: 660, cowbell: 900, click: 1400 },
  normal: { woodblock: 760, beep: 440, cowbell: 720, click: 1100 },
  subdivision: { woodblock: 560, beep: 330, cowbell: 540, click: 800 },
}

const DECAY: Record<ClickSound, number> = {
  woodblock: 0.05,
  beep: 0.07,
  cowbell: 0.1,
  click: 0.025,
}

let noiseBuffer: AudioBuffer | null = null

function getNoiseBuffer(context: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const length = Math.floor(context.sampleRate * 0.05)
    noiseBuffer = context.createBuffer(1, length, context.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) {
      data[index] = Math.random() * 2 - 1
    }
  }
  return noiseBuffer
}

/**
 * Schedules one click at `time` against a destination node.
 * The caller owns the destination (a master gain) so playback can be muted
 * instantly on stop.
 */
export function scheduleClick(
  context: AudioContext,
  destination: AudioNode,
  time: number,
  kind: ClickKind,
  sound: ClickSound,
  volume: number,
): void {
  if (volume <= 0) return

  const frequency = FREQUENCIES[kind][sound]
  const decay = DECAY[sound]
  const gain = context.createGain()
  gain.connect(destination)
  gain.gain.setValueAtTime(volume, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + decay)

  if (sound === 'click') {
    const source = context.createBufferSource()
    source.buffer = getNoiseBuffer(context)
    const filter = context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = frequency
    source.connect(filter)
    filter.connect(gain)
    source.start(time)
    source.stop(time + decay + 0.01)
    return
  }

  const oscillator = context.createOscillator()
  if (sound === 'cowbell') {
    oscillator.type = 'square'
    const partial = context.createOscillator()
    partial.type = 'square'
    partial.frequency.value = frequency * 1.47
    const partialGain = context.createGain()
    partialGain.gain.value = 0.4
    partial.connect(partialGain)
    partialGain.connect(gain)
    partial.start(time)
    partial.stop(time + decay + 0.01)
  } else {
    oscillator.type = sound === 'beep' ? 'sine' : 'triangle'
  }
  oscillator.frequency.value = frequency
  oscillator.connect(gain)
  oscillator.start(time)
  oscillator.stop(time + decay + 0.01)
}

/** Short three-note chime used when a session section finishes. */
export function playChime(context: AudioContext): void {
  const now = context.currentTime
  const notes = [659.25, 783.99, 987.77] // E5 G5 B5
  notes.forEach((frequency, index) => {
    const time = now + index * 0.09
    const gain = context.createGain()
    gain.connect(context.destination)
    gain.gain.setValueAtTime(0.35, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3)
    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    oscillator.connect(gain)
    oscillator.start(time)
    oscillator.stop(time + 0.32)
  })
}
