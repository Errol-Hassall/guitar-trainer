import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { computePeaks } from '#/lib/audio'
import { clampBpm } from '#/lib/metronome'
import { formatClock } from '#/lib/sessions'
import { getRecordingData } from '#/server/api'
import { decodeBase64Audio } from './audio/decode'
import { getAudioContext } from './metronome/audio'
import { useMetronome } from './metronome/use-metronome'
import { Button } from './ui/button'
import { Field, controlClass } from './ui/field'

type Phase = 'loading' | 'ready' | 'playing' | 'error'

/**
 * Waveform playback of one take with an optional metronome click overlay.
 * Selecting a recording always starts playback (selection is the intent).
 */
export function RecordingPlayer({
  recordingId,
  onEnded,
}: {
  recordingId: number
  onEnded?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState('')
  const [position, setPosition] = useState(0)
  const [clicks, setClicks] = useState(false)
  const [bpm, setBpm] = useState(120)

  const bufferRef = useRef<AudioBuffer | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const playheadRef = useRef<{ startedAt: number; offset: number } | null>(null)
  const offsetRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  const metronome = useMetronome({
    bpm: clampBpm(bpm),
    beats: 4,
    beatUnit: 4,
    subdivision: 'none',
    accents: [2, 0, 0, 0],
    countInBars: 0,
    stopAfterBars: 0,
    gapClick: false,
    sound: 'woodblock',
    haptics: false,
    volumes: { dominant: 1, accent: 1, normal: 1, subdivision: 1 },
  })

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

  function playFrom() {
    const buffer = bufferRef.current
    if (!buffer) return
    stopSource()
    const context = getAudioContext()
    if (context.state === 'suspended') void context.resume()

    const offset = Math.min(offsetRef.current, Math.max(0, buffer.duration - 0.05))
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    source.onended = () => {
      if (sourceRef.current !== source) return
      stopSource()
      metronome.stop()
      offsetRef.current = 0
      setPhase('ready')
      setPosition(0)
      onEndedRef.current?.()
    }
    source.start(0, offset)
    sourceRef.current = source
    playheadRef.current = { startedAt: context.currentTime, offset }

    let lastRender = 0
    const loop = () => {
      const head = playheadRef.current
      if (!head) return
      offsetRef.current = Math.min(
        buffer.duration,
        head.offset + context.currentTime - head.startedAt,
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
    if (clicks) void metronome.start()
  }

  function pause() {
    const buffer = bufferRef.current
    const head = playheadRef.current
    if (buffer && head) {
      offsetRef.current = Math.min(
        buffer.duration,
        head.offset + getAudioContext().currentTime - head.startedAt,
      )
    }
    stopSource()
    metronome.stop()
    setPhase('ready')
    setPosition(offsetRef.current)
  }

  function togglePlay() {
    const buffer = bufferRef.current
    if (!buffer) return
    if (phase === 'playing') {
      pause()
      return
    }
    // At the end of the take, play restarts from the top.
    if (offsetRef.current >= buffer.duration - 0.05) offsetRef.current = 0
    playFrom()
  }

  function restart() {
    stopSource()
    metronome.stop()
    offsetRef.current = 0
    setPosition(0)
    playFrom()
  }

  useEffect(() => {
    let cancelled = false
    stopSource()
    bufferRef.current = null
    offsetRef.current = 0
    setError('')
    setPosition(0)
    setPhase('loading')

    void (async () => {
      try {
        const stored = await getRecordingData({ data: { id: recordingId } })
        if (!stored) throw new Error('Recording not found.')
        const buffer = await decodeBase64Audio(stored.dataB64, stored.mime)
        if (cancelled) return
        bufferRef.current = buffer
        setPhase('ready')
        playFrom()
      } catch (cause) {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : 'Could not load the recording.')
        setPhase('error')
      }
    })()

    return () => {
      cancelled = true
      stopSource()
      metronome.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the take changes
  }, [recordingId])

  const buffer = bufferRef.current

  return (
    <div data-player-state={phase} className="flex flex-col gap-3">
      {error !== '' ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {buffer ? (
        <Waveform buffer={buffer} position={position} />
      ) : phase === 'loading' ? (
        <p className="py-8 text-center text-sm text-muted">Loading…</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={togglePlay} disabled={phase !== 'ready' && phase !== 'playing'}>
          {phase === 'playing' ? (
            <Pause className="size-4" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
          {phase === 'playing' ? 'Pause' : 'Play'}
        </Button>
        <Button variant="ghost" size="lg" onClick={restart} disabled={!buffer || phase === 'loading'}>
          <RotateCcw className="size-4" aria-hidden="true" /> Restart
        </Button>
        <span className="ml-auto text-sm text-muted tabular-nums">
          {formatClock(Math.floor(position))} / {formatClock(Math.floor(buffer?.duration ?? 0))}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={clicks}
            onChange={(event) => {
              const next = event.target.checked
              setClicks(next)
              if (!next && phase === 'playing') metronome.stop()
            }}
            className="size-5 accent-[#f4b942]"
          />
          Metronome overlay
        </label>
        <Field label="BPM" htmlFor="player-bpm">
          <input
            id="player-bpm"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={bpm}
            onChange={(event) => setBpm(Number(event.target.value))}
            className={`${controlClass} w-24`}
          />
        </Field>
      </div>
    </div>
  )
}

const PEAK_BARS = 120

function Waveform({ buffer, position }: { buffer: AudioBuffer; position: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const peaks = computePeaks(buffer.getChannelData(0), PEAK_BARS)
    const progress = buffer.duration > 0 ? position / buffer.duration : 0
    const barWidth = width / peaks.length

    ctx.clearRect(0, 0, width, height)
    for (let i = 0; i < peaks.length; i += 1) {
      const barHeight = Math.max(2, peaks[i] * height)
      ctx.fillStyle = i / peaks.length <= progress ? '#f4b942' : '#283746'
      ctx.fillRect(i * barWidth + 1, (height - barHeight) / 2, barWidth - 2, barHeight)
    }
  }, [buffer, position])

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={96}
      className="h-24 w-full rounded-lg border border-line bg-raised"
      aria-label="Recording waveform"
    />
  )
}
