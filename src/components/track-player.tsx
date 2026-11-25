import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Square } from 'lucide-react'
import type { BackingTrack } from '#/lib/types'
import { playbackRateFor, stretchFactorFor, timeStretch } from '#/lib/timestretch'
import { formatClock } from '#/lib/sessions'
import { getTrackData } from '#/server/api'
import { decodeBase64Audio, fetchUrlAudio } from './audio/decode'
import { getAudioContext } from './metronome/audio'
import { Button } from './ui/button'
import { Field, controlClass } from './ui/field'

type Phase = 'loading' | 'stretching' | 'ready' | 'playing' | 'paused' | 'error'

const TEMPO_MIN = 0.5
const TEMPO_MAX = 2

/**
 * Backing track playback: WSOLA time-stretch (pitch preserved), independent
 * pitch shift, A/B loop points, gradual ramp-up and a track-side fade for
 * "disappear into the mix" work. All positions are in original-timeline seconds.
 */
export function TrackPlayer({ track }: { track: BackingTrack }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState('')
  const [position, setPosition] = useState(0)
  const [tempo, setTempo] = useState(1)
  const [semitones, setSemitones] = useState(0)
  const [loopA, setLoopA] = useState<number | null>(null)
  const [loopB, setLoopB] = useState<number | null>(null)
  const [looping, setLooping] = useState(false)
  const [volume, setVolume] = useState(1)
  const [rampStart, setRampStart] = useState(1)
  const [rampEnd, setRampEnd] = useState(1.5)
  const [rampPasses, setRampPasses] = useState(4)

  const baseRef = useRef<AudioBuffer | null>(null)
  const stretchedRef = useRef<Map<string, AudioBuffer>>(new Map())
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const playheadRef = useRef<{ startedAt: number; start: number; tempo: number } | null>(null)
  const offsetRef = useRef(0)
  const rampRef = useRef<{ pass: number; temps: number[] } | null>(null)

  const controlsRef = useRef({ tempo, semitones, loopA, loopB, looping, volume })
  controlsRef.current = { tempo, semitones, loopA, loopB, looping, volume }

  function region(): { start: number; end: number } {
    const duration = baseRef.current?.duration ?? 0
    const c = controlsRef.current
    if (c.loopA !== null && c.loopB !== null && c.loopB > c.loopA) {
      return { start: c.loopA, end: c.loopB }
    }
    return { start: 0, end: duration }
  }

  function ensureGain(): GainNode {
    const context = getAudioContext()
    if (!gainRef.current || gainRef.current.context !== context) {
      gainRef.current?.disconnect()
      const gain = context.createGain()
      gain.gain.value = controlsRef.current.volume
      gain.connect(context.destination)
      gainRef.current = gain
    }
    return gainRef.current
  }

  function stopSource() {
    if (sourceRef.current) {
      sourceRef.current.onended = null
      try {
        sourceRef.current.stop()
      } catch {
        // Already stopped.
      }
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    playheadRef.current = null
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  function stretchedFor(tempo: number, semis: number): AudioBuffer {
    const base = baseRef.current as AudioBuffer
    const key = `${tempo}:${semis}`
    const cached = stretchedRef.current.get(key)
    if (cached) return cached

    const factor = stretchFactorFor(tempo, semis)
    const context = getAudioContext()
    const out = context.createBuffer(
      base.numberOfChannels,
      Math.max(1, Math.round(base.length * factor)),
      base.sampleRate,
    )
    for (let channel = 0; channel < base.numberOfChannels; channel += 1) {
      const stretched = timeStretch(base.getChannelData(channel), base.sampleRate, factor)
      out.getChannelData(channel).set(stretched.subarray(0, Math.min(out.length, stretched.length)))
    }
    if (stretchedRef.current.size >= 8) {
      stretchedRef.current.delete(stretchedRef.current.keys().next().value as string)
    }
    stretchedRef.current.set(key, out)
    return out
  }

  function startAt(fromOriginal: number, tempo: number) {
    const base = baseRef.current
    if (!base) return
    stopSource()
    const context = getAudioContext()
    if (context.state === 'suspended') void context.resume()

    const semis = controlsRef.current.semitones
    const factor = stretchFactorFor(tempo, semis)
    const buffer = tempo !== 1 || semis !== 0 ? stretchedFor(tempo, semis) : base
    const { start, end } = region()
    if (end - start < 0.05) return

    const from = Math.max(start, Math.min(fromOriginal, end - 0.01))
    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = playbackRateFor(semis)
    source.connect(ensureGain())
    source.onended = () => {
      if (sourceRef.current !== source) return
      onPassEnd()
    }
    source.start(0, from * factor, (end - from) * factor)
    sourceRef.current = source
    playheadRef.current = { startedAt: context.currentTime, start: from, tempo }

    let lastRender = 0
    const loop = () => {
      const head = playheadRef.current
      if (!head) return
      const { end: regionEnd } = region()
      offsetRef.current = Math.min(
        regionEnd,
        head.start + (context.currentTime - head.startedAt) * head.tempo,
      )
      const now = performance.now()
      if (now - lastRender > 100) {
        lastRender = now
        setPosition(offsetRef.current)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    setPhase('playing')
  }

  async function ensureAndStart(fromOriginal: number, tempo: number) {
    const semis = controlsRef.current.semitones
    if ((tempo !== 1 || semis !== 0) && !stretchedRef.current.has(`${tempo}:${semis}`)) {
      // Yield a frame so the "stretching" state paints before the CPU work.
      setPhase('stretching')
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
    startAt(fromOriginal, tempo)
  }

  function onPassEnd() {
    stopSource()
    const ramp = rampRef.current
    if (ramp) {
      if (ramp.pass + 1 < ramp.temps.length) {
        ramp.pass += 1
        void ensureAndStart(region().start, ramp.temps[ramp.pass])
        return
      }
      rampRef.current = null
    }
    const c = controlsRef.current
    if (c.looping && region().end - region().start > 0.05) {
      offsetRef.current = region().start
      void ensureAndStart(region().start, c.tempo)
      return
    }
    rampRef.current = null
    offsetRef.current = 0
    setPhase('ready')
    setPosition(0)
  }

  function currentPosition(): number {
    const head = playheadRef.current
    if (head) {
      return Math.min(
        region().end,
        head.start + (getAudioContext().currentTime - head.startedAt) * head.tempo,
      )
    }
    return offsetRef.current
  }

  function togglePlay() {
    const base = baseRef.current
    if (!base) return
    if (phase === 'playing') {
      offsetRef.current = currentPosition()
      stopSource()
      rampRef.current = null
      setPhase('paused')
      setPosition(offsetRef.current)
      return
    }
    const { start, end } = region()
    const from = offsetRef.current >= end - 0.05 ? start : offsetRef.current
    void ensureAndStart(from, controlsRef.current.tempo)
  }

  function stopAll() {
    stopSource()
    rampRef.current = null
    offsetRef.current = 0
    setPhase('ready')
    setPosition(0)
  }

  function setPoint(which: 'a' | 'b') {
    const pos = Math.round(currentPosition() * 10) / 10
    if (which === 'a') {
      setLoopA(pos)
      if (loopB !== null && loopB <= pos) setLoopB(null)
    } else {
      setLoopB(pos)
      if (loopA !== null && loopA >= pos) setLoopA(null)
    }
  }

  function startRamp() {
    const temps: number[] = []
    for (let i = 0; i < rampPasses; i += 1) {
      const value =
        rampPasses === 1 ? rampEnd : rampStart + ((rampEnd - rampStart) * i) / (rampPasses - 1)
      temps.push(Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, value)))
    }
    rampRef.current = { pass: 0, temps }
    offsetRef.current = region().start
    void ensureAndStart(region().start, temps[0])
  }

  useEffect(() => {
    let cancelled = false
    stopSource()
    baseRef.current = null
    stretchedRef.current.clear()
    rampRef.current = null
    offsetRef.current = 0
    setError('')
    setPosition(0)
    setPhase('loading')

    void (async () => {
      try {
        let buffer: AudioBuffer
        if (track.source === 'file') {
          const stored = await getTrackData({ data: { id: track.id } })
          if (!stored) throw new Error('Track file is missing.')
          buffer = await decodeBase64Audio(stored.dataB64, stored.mime)
        } else {
          buffer = await fetchUrlAudio(track.url as string)
        }
        if (cancelled) return
        baseRef.current = buffer
        ensureGain()
        setPhase('ready')
      } catch (cause) {
        if (cancelled) return
        setError(
          cause instanceof Error ? cause.message : 'Could not load the track.',
        )
        setPhase('error')
      }
    })()

    return () => {
      cancelled = true
      stopSource()
      gainRef.current?.disconnect()
      gainRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the track changes
  }, [track.id])

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume
  }, [volume])

  const duration = baseRef.current?.duration ?? 0
  const progress = duration > 0 ? position / duration : 0

  return (
    <div data-track-status={phase} className="flex flex-col gap-4">
      {error !== '' ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={togglePlay} disabled={!baseRef.current || phase === 'loading' || phase === 'stretching'}>
          {phase === 'playing' ? (
            <Pause className="size-4" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
          {phase === 'playing' ? 'Pause' : 'Play'}
        </Button>
        <Button variant="ghost" size="lg" onClick={stopAll} disabled={!baseRef.current || phase === 'loading'}>
          <Square className="size-4" aria-hidden="true" /> Stop
        </Button>
        {phase === 'stretching' ? (
          <span className="text-sm text-muted">Stretching…</span>
        ) : null}
        <span className="ml-auto text-sm text-muted tabular-nums">
          {formatClock(Math.floor(position))} / {formatClock(Math.floor(duration))}
        </span>
      </div>

      <div className="relative h-2 w-full rounded-full bg-raised" aria-hidden="true">
        <div
          className="absolute top-0 left-0 h-2 rounded-full bg-accent"
          style={{ width: `${progress * 100}%` }}
        />
        {loopA !== null && duration > 0 ? (
          <div className="absolute top-[-4px] h-4 w-0.5 bg-ink/70" style={{ left: `${(loopA / duration) * 100}%` }} />
        ) : null}
        {loopB !== null && duration > 0 ? (
          <div className="absolute top-[-4px] h-4 w-0.5 bg-ink/70" style={{ left: `${(loopB / duration) * 100}%` }} />
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Button variant="secondary" size="sm" onClick={() => setPoint('a')} disabled={!baseRef.current}>
          Set A
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setPoint('b')} disabled={!baseRef.current}>
          Set B
        </Button>
        <Button
          variant={looping ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setLooping((value) => !value)}
          disabled={loopA === null || loopB === null}
          aria-pressed={looping}
        >
          Loop
        </Button>
        <span className="min-h-9 self-center text-xs text-muted tabular-nums" data-loop-a={loopA ?? ''} data-loop-b={loopB ?? ''}>
          {loopA !== null && loopB !== null
            ? `A ${formatClock(Math.floor(loopA))} – B ${formatClock(Math.floor(loopB))}`
            : 'No loop points'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <Field
          label={`Tempo · ${Math.round(tempo * 100)}%`}
          htmlFor="track-tempo"
          hint="Time-stretched, pitch preserved."
        >
          <input
            id="track-tempo"
            data-tempo={Math.round(tempo * 100)}
            type="range"
            min={TEMPO_MIN * 100}
            max={TEMPO_MAX * 100}
            step={5}
            value={tempo * 100}
            onChange={(event) => setTempo(Number(event.target.value) / 100)}
            className="min-h-11 w-full accent-[#f4b942]"
          />
        </Field>
        <Field label="Pitch shift" htmlFor="track-pitch">
          <select
            id="track-pitch"
            value={semitones}
            onChange={(event) => setSemitones(Number(event.target.value))}
            className={controlClass}
          >
            {Array.from({ length: 25 }, (_, index) => index - 12).map((semi) => (
              <option key={semi} value={semi}>
                {semi === 0 ? 'Original' : `${semi > 0 ? '+' : ''}${semi} semitones`}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Ramp from" htmlFor="ramp-start">
          <input
            id="ramp-start"
            type="number"
            inputMode="numeric"
            min={TEMPO_MIN * 100}
            max={TEMPO_MAX * 100}
            value={Math.round(rampStart * 100)}
            onChange={(event) => setRampStart(Number(event.target.value) / 100)}
            className={`${controlClass} w-24`}
          />
        </Field>
        <Field label="Ramp to" htmlFor="ramp-end">
          <input
            id="ramp-end"
            type="number"
            inputMode="numeric"
            min={TEMPO_MIN * 100}
            max={TEMPO_MAX * 100}
            value={Math.round(rampEnd * 100)}
            onChange={(event) => setRampEnd(Number(event.target.value) / 100)}
            className={`${controlClass} w-24`}
          />
        </Field>
        <Field label="Passes" htmlFor="ramp-passes">
          <input
            id="ramp-passes"
            type="number"
            inputMode="numeric"
            min={1}
            max={8}
            value={rampPasses}
            onChange={(event) => setRampPasses(Math.max(1, Math.min(8, Number(event.target.value))))}
            className={`${controlClass} w-20`}
          />
        </Field>
        <Button variant="secondary" onClick={startRamp} disabled={!baseRef.current || phase === 'playing'}>
          Start ramp
        </Button>
      </div>

      <Field
        label={`Track volume · ${Math.round(volume * 100)}%`}
        htmlFor="track-volume"
        hint="Fade the track down as you take over."
      >
        <input
          id="track-volume"
          type="range"
          min={0}
          max={100}
          step={5}
          value={volume * 100}
          onChange={(event) => setVolume(Number(event.target.value) / 100)}
          className="min-h-11 w-full accent-[#f4b942]"
        />
      </Field>
    </div>
  )
}
