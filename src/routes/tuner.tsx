import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { MicOff, Square } from 'lucide-react'
import { detectPitch, frequencyToNote, NOTE_NAMES, PITCH_MAX_HZ, PITCH_MIN_HZ } from '#/lib/audio'
import { getAudioContext } from '#/components/metronome/audio'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/tuner')({ component: TunerPage })

const C4_HZ = 261.6256

/** Every note the tuner can report, low E to high E and a bit beyond. */
const TARGET_NOTES: { label: string; frequency: number }[] = (() => {
  const notes: { label: string; frequency: number }[] = []
  for (let octave = 2; octave <= 6; octave += 1) {
    NOTE_NAMES.forEach((name, index) => {
      const step = (octave - 4) * 12 + index
      const frequency = C4_HZ * 2 ** (step / 12)
      if (frequency >= PITCH_MIN_HZ && frequency <= PITCH_MAX_HZ) {
        notes.push({ label: `${name}${octave}`, frequency })
      }
    })
  }
  return notes
})()

type TunerState = 'idle' | 'listening' | 'error'

interface Reading {
  noteLabel: string
  cents: number
  /** Cents away from the chosen target, when one is set. */
  targetCents: number | null
}

function TunerPage() {
  const [state, setState] = useState<TunerState>('idle')
  const [error, setError] = useState('')
  const [reading, setReading] = useState<Reading | null>(null)
  const [targetLabel, setTargetLabel] = useState('')

  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef<number | null>(null)
  targetRef.current = TARGET_NOTES.find((note) => note.label === targetLabel)?.frequency ?? null

  useEffect(() => {
    return () => stopListening()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup only
  }, [])

  function stopListening() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    analyserRef.current = null
  }

  async function startListening() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const context = getAudioContext()
      if (context.state === 'suspended') await context.resume()
      const sampleRate = context.sampleRate
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      context.createMediaStreamSource(stream).connect(analyser)
      analyserRef.current = analyser
      setState('listening')

      const samples = new Float32Array(analyser.fftSize)
      let lastRender = 0
      const loop = () => {
        const analyser = analyserRef.current
        if (!analyser) return
        analyser.getFloatTimeDomainData(samples)
        // Only the most recent window is relevant to what the player just played.
        const windowSize = Math.min(1024, samples.length)
        const slice = samples.subarray(samples.length - windowSize, samples.length)
        const frequency = detectPitch(slice, sampleRate)
        rafRef.current = requestAnimationFrame(loop)

        const now = performance.now()
        if (now - lastRender < 80) return
        lastRender = now

        if (frequency === null) {
          setReading(null)
          return
        }
        const note = frequencyToNote(frequency)
        if (!note) return
        const target = targetRef.current
        setReading({
          noteLabel: `${note.name}${note.octave}`,
          cents: note.cents,
          targetCents: target === null ? null : Math.round(1200 * Math.log2(frequency / target)),
        })
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch {
      stopListening()
      setError('Microphone unavailable. Check browser permissions and try again.')
      setState('error')
    }
  }

  function stop() {
    stopListening()
    setReading(null)
    setState('idle')
  }

  const targetNote = TARGET_NOTES.find((note) => note.label === targetLabel)
  const inTune =
    reading !== null && reading.targetCents !== null && Math.abs(reading.targetCents) <= 10

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title="Tuner"
        description="Chromatic tuner. Pick a target note to check bends against it."
      />

      <div data-tuner-state={state} className="flex flex-col gap-4">
        {error !== '' ? (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Card title="Live note">
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              data-tuner-note={reading?.noteLabel ?? ''}
              data-tuner-cents={reading ? String(reading.cents) : '0'}
              className={`text-6xl font-semibold tabular-nums ${inTune ? 'text-accent' : ''}`}
            >
              {state === 'listening' && reading === null ? (
                <span className="text-2xl text-muted">— listening —</span>
              ) : (
                reading?.noteLabel ?? '–'
              )}
            </div>

            {reading !== null ? (
              <div className="flex w-full max-w-xs flex-col gap-1">
                <CentsBar cents={reading.cents} />
                <p className="text-center text-sm text-muted tabular-nums">
                  {reading.cents >= 0 ? '+' : ''}
                  {reading.cents}¢ from {reading.noteLabel}
                  {reading.targetCents !== null && targetNote ? (
                    <>
                      {' · '}
                      <span className={inTune ? 'font-medium text-accent' : ''}>
                        {reading.targetCents >= 0 ? '+' : ''}
                        {reading.targetCents}¢ from target {targetNote.label}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              {state === 'listening' ? (
                <Button variant="secondary" size="lg" onClick={stop}>
                  <Square className="size-4" aria-hidden="true" /> Stop
                </Button>
              ) : (
                <Button size="lg" onClick={() => void startListening()}>
                  {state === 'error' ? <MicOff className="size-4" aria-hidden="true" /> : null} Start
                </Button>
              )}
            </div>

            <Field label="Target note (for bends)" htmlFor="tuner-target">
              <select
                id="tuner-target"
                value={targetLabel}
                onChange={(event) => setTargetLabel(event.target.value)}
                className={`${controlClass} max-w-40`}
              >
                <option value="">No target</option>
                {TARGET_NOTES.map((note) => (
                  <option key={note.label} value={note.label}>
                    {note.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
      </div>
    </main>
  )
}

function CentsBar({ cents }: { cents: number }) {
  const clamped = Math.max(-50, Math.min(50, cents))
  return (
    <div className="relative h-2 w-full rounded-full bg-raised" aria-hidden="true">
      <div className="absolute top-0 left-1/2 h-2 w-px -translate-x-1/2 bg-line" />
      <div
        className="absolute top-0 h-2 w-1 -translate-x-1/2 rounded-full bg-accent"
        style={{ left: `${50 + clamped}%` }}
      />
    </div>
  )
}
