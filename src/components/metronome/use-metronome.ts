import { useCallback, useEffect, useRef, useState } from 'react'
import type { AccentLevel, BeatUnit, ClickSound, Subdivision } from '#/lib/types'
import { subdivisionOffsets } from '#/lib/metronome'
import { getAudioContext, scheduleClick, unlockAudio } from './audio'

export interface MetronomeSettings {
  bpm: number
  beats: number
  beatUnit: BeatUnit
  subdivision: Subdivision
  accents: AccentLevel[]
  countInBars: number
  /** Playing bars before the metronome stops itself; 0 = keep playing. */
  stopAfterBars: number
  gapClick: boolean
  sound: ClickSound
  haptics: boolean
  volumes: {
    dominant: number
    accent: number
    normal: number
    subdivision: number
  }
}

export interface MetronomeVisual {
  state: 'stopped' | 'count-in' | 'playing'
  /** Zero-based beat index within the current bar (0 when stopped). */
  beat: number
  /** Remaining count-in beats, only meaningful while counting in. */
  countInRemaining: number
  barProgress: number
  beatProgress: number
}

const LOOKAHEAD_SECONDS = 0.12
const SCHEDULER_INTERVAL_MS = 25

interface BeatEvent {
  time: number
  beat: number
  barStart: number
  barDuration: number
}

export function useMetronome(settings: MetronomeSettings) {
  const [isPlaying, setIsPlaying] = useState(false)

  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const masterRef = useRef<GainNode | null>(null)
  const schedulerRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const nextTickTimeRef = useRef(0)
  /** Audio time of the first scheduled tick (count-in beat 1 or playing beat 1). */
  const gridStartRef = useRef(0)
  const tickIndexRef = useRef(0)
  const barIndexRef = useRef(0)
  const countInBeatsRef = useRef(0)
  const eventsRef = useRef<BeatEvent[]>([])
  const visualRef = useRef<MetronomeVisual>({
    state: 'stopped',
    beat: 0,
    countInRemaining: 0,
    barProgress: 0,
    beatProgress: 0,
  })

  const stop = useCallback(() => {
    if (schedulerRef.current !== null) {
      clearInterval(schedulerRef.current)
      schedulerRef.current = null
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const context = getAudioContext()
    const master = masterRef.current
    if (master) {
      master.gain.cancelScheduledValues(context.currentTime)
      master.gain.setValueAtTime(master.gain.value, context.currentTime)
      master.gain.linearRampToValueAtTime(0, context.currentTime + 0.05)
      window.setTimeout(() => master.disconnect(), 120)
    }
    masterRef.current = null
    eventsRef.current = []
    visualRef.current = {
      state: 'stopped',
      beat: 0,
      countInRemaining: 0,
      barProgress: 0,
      beatProgress: 0,
    }
    setIsPlaying(false)
  }, [])

  const scheduleTick = useCallback((time: number) => {
    const context = getAudioContext()
    const master = masterRef.current
    if (!master) return
    const s = settingsRef.current
    const offsets = subdivisionOffsets(s.subdivision)
    const ticksPerBeat = offsets.length
    const beatDuration = 60 / s.bpm

    if (countInBeatsRef.current > 0) {
      countInBeatsRef.current -= 1
      const remaining = countInBeatsRef.current
      scheduleClick(
        context,
        master,
        time,
        remaining === 0 ? 'dominant' : 'normal',
        s.sound,
        remaining === 0 ? s.volumes.dominant : s.volumes.normal,
      )
      visualRef.current = {
        state: 'count-in',
        beat: 0,
        countInRemaining: remaining,
        barProgress: 0,
        beatProgress: 0,
      }
      if (remaining === 0) {
        tickIndexRef.current = 0
        barIndexRef.current = 0
      }
      nextTickTimeRef.current += beatDuration
      return
    }

    const totalTicks = s.beats * ticksPerBeat
    const tickIndex = tickIndexRef.current % totalTicks
    const beatIndex = Math.floor(tickIndex / ticksPerBeat)
    const subIndex = tickIndex % ticksPerBeat
    const muted = s.gapClick && barIndexRef.current % 2 === 1
    // Rest beats (level 3) count but don't play.
    const resting = (s.accents[beatIndex] ?? 0) === 3

    if (subIndex === 0) {
      const level = s.accents[beatIndex] ?? 0
      if (!resting) {
        scheduleClick(
          context,
          master,
          time,
          level === 2 ? 'dominant' : level === 1 ? 'accent' : 'normal',
          s.sound,
          muted
            ? 0
            : level === 2
              ? s.volumes.dominant
              : level === 1
                ? s.volumes.accent
                : s.volumes.normal,
        )
      }
      eventsRef.current.push({
        time,
        beat: beatIndex,
        barStart: time - beatIndex * beatDuration,
        barDuration: s.beats * beatDuration,
      })
    } else if (!resting) {
      scheduleClick(
        context,
        master,
        time,
        'subdivision',
        s.sound,
        muted ? 0 : s.volumes.subdivision,
      )
    }

    tickIndexRef.current += 1
    if (tickIndexRef.current >= totalTicks) {
      tickIndexRef.current = 0
      barIndexRef.current += 1
      // Count-in bars don't count toward the stop-after limit.
      if (s.stopAfterBars > 0 && barIndexRef.current >= s.stopAfterBars) {
        stop()
      }
    }

    const nextInterval =
      s.subdivision === 'swing' && subIndex === 0
        ? (2 / 3) * beatDuration
        : s.subdivision === 'gallop' && subIndex === 0
          ? (1 / 3) * beatDuration
          : beatDuration / ticksPerBeat
    nextTickTimeRef.current += nextInterval
  }, [stop])

  const schedulerLoop = useCallback(() => {
    const context = getAudioContext()
    // stop() clears the interval; bail out if it fires mid-schedule.
    while (
      schedulerRef.current !== null &&
      nextTickTimeRef.current < context.currentTime + LOOKAHEAD_SECONDS
    ) {
      scheduleTick(nextTickTimeRef.current)
    }
  }, [scheduleTick])

  const consumeEvents = useCallback(() => {
    const context = getAudioContext()
    const now = context.currentTime
    let latest: BeatEvent | null = null
    while (eventsRef.current.length > 0 && eventsRef.current[0].time <= now) {
      latest = eventsRef.current.shift() ?? null
    }
    if (!latest) return

    const s = settingsRef.current
    // Rest beats count but don't play — no haptic pulse either.
    if (
      s.haptics &&
      (s.accents[latest.beat] ?? 0) !== 3 &&
      typeof navigator.vibrate === 'function' &&
      visualRef.current.state === 'playing'
    ) {
      navigator.vibrate(latest.beat === 0 ? 25 : 10)
    }

    const beatDuration = 60 / s.bpm
    visualRef.current = {
      state: 'playing',
      beat: latest.beat,
      countInRemaining: 0,
      barProgress: Math.min(1, (now - latest.barStart) / latest.barDuration),
      beatProgress: Math.min(1, (now - latest.time) / beatDuration),
    }
  }, [])

  const rafLoop = useCallback(() => {
    consumeEvents()
    rafRef.current = requestAnimationFrame(rafLoop)
  }, [consumeEvents])

  const start = useCallback(async () => {
    if (schedulerRef.current !== null) return
    const context = await unlockAudio()
    const master = context.createGain()
    master.gain.value = 1
    master.connect(context.destination)
    masterRef.current = master

    const s = settingsRef.current
    nextTickTimeRef.current = context.currentTime + 0.15
    gridStartRef.current = nextTickTimeRef.current
    tickIndexRef.current = 0
    barIndexRef.current = 0
    countInBeatsRef.current = s.countInBars * s.beats
    eventsRef.current = []
    visualRef.current = {
      state: s.countInBars > 0 ? 'count-in' : 'playing',
      beat: 0,
      countInRemaining: countInBeatsRef.current,
      barProgress: 0,
      beatProgress: 0,
    }

    schedulerRef.current = window.setInterval(schedulerLoop, SCHEDULER_INTERVAL_MS)
    rafRef.current = requestAnimationFrame(rafLoop)
    setIsPlaying(true)
  }, [rafLoop, schedulerLoop])

  useEffect(() => {
    return () => {
      if (schedulerRef.current !== null) clearInterval(schedulerRef.current)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      const master = masterRef.current
      if (master) master.disconnect()
    }
  }, [])

  // Stable identity: consumers may poll it in effects without re-subscribing.
  const getVisual = useCallback(() => visualRef.current, [])

  /**
   * Signed ms from the nearest beat of the running grid (positive = late);
   * null when not playing. shortcut: assumes a constant BPM for the run —
   * consumers that score taps must reset when the tempo changes.
   */
  const getTapOffsetMs = useCallback(() => {
    if (schedulerRef.current === null || masterRef.current === null) return null
    const s = settingsRef.current
    const now = getAudioContext().currentTime
    const beatDuration = 60 / s.bpm
    const beatsIn = (now - gridStartRef.current) / beatDuration
    return (beatsIn - Math.round(beatsIn)) * beatDuration * 1000
  }, [])

  return { isPlaying, start, stop, getVisual, getTapOffsetMs }
}
