import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import type { RhythmRun } from '#/lib/types'
import { BPM_MAX, BPM_MIN } from '#/lib/types'
import { clampBpm } from '#/lib/metronome'
import { scoreTaps } from '#/lib/rhythm'
import { listRhythmRuns, logRhythmRun } from '#/server/api'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'
import { useGlobalMetronome } from '#/components/metronome/global-metronome'

export const Route = createFileRoute('/trainer')({
  component: TrainerPage,
  loader: () => listRhythmRuns({ data: { limit: 10 } }),
})

function offsetText(offsetMs: number): string {
  if (offsetMs === 0) return 'on beat'
  return offsetMs > 0 ? `late by ${offsetMs} ms` : `early by ${-offsetMs} ms`
}

export function TrainerPage() {
  const runs = Route.useLoaderData() as RhythmRun[]
  const router = useRouter()
  const { bpm, setBpm, beats, isPlaying, start, stop, getTapOffsetMs } = useGlobalMetronome()

  const [hits, setHits] = useState<number[]>([])
  const [lastHit, setLastHit] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // A run is one tempo: changing the tempo or bar length starts a fresh score.
  useEffect(() => {
    setHits([])
    setLastHit(null)
  }, [bpm, beats])

  const score = useMemo(() => scoreTaps(hits, bpm), [hits, bpm])

  function handleTap() {
    const offset = getTapOffsetMs()
    if (offset === null) return
    const rounded = Math.round(offset)
    setHits((previous) => [...previous, rounded])
    setLastHit(rounded)
  }

  // Space bar taps too; ignore presses while a control has focus.
  const tapRef = useRef(handleTap)
  tapRef.current = handleTap
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.repeat) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return
      event.preventDefault()
      tapRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleSave() {
    if (score.hits < 4) return
    const { advice: _advice, ...saved } = score
    setSaving(true)
    try {
      await logRhythmRun({ data: { bpm, ...saved } })
      router.invalidate()
    } finally {
      setSaving(false)
    }
  }

  return (
    <main
      className="mx-auto max-w-4xl px-4 py-8"
      data-trainer-state={isPlaying ? 'playing' : 'stopped'}
    >
      <PageHeader
        title="Rhythm Trainer"
        description="Tap along with the click (button or space bar). Every tap is scored against the nearest beat; the tempo is shared with the metronome."
      />
      <div className="flex flex-col gap-4">
        <Card title="Trainer" description="Start the click, then tap on every beat.">
          <div className="flex flex-col gap-5">
            <Field label="Tempo (BPM)" htmlFor="trainer-bpm" hint={`Supported ${BPM_MIN}–${BPM_MAX}`}>
              <input
                id="trainer-bpm"
                type="number"
                inputMode="numeric"
                min={BPM_MIN}
                max={BPM_MAX}
                value={bpm}
                onChange={(event) => setBpm(clampBpm(Number(event.target.value)))}
                className={`${controlClass} max-w-24 text-center font-mono text-lg`}
              />
            </Field>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="xl" onClick={() => (isPlaying ? void stop() : void start())} data-trainer-toggle="true">
                {isPlaying ? 'Stop' : 'Start'}
              </Button>
              <Button
                size="xl"
                variant="secondary"
                disabled={!isPlaying}
                onClick={handleTap}
                data-trainer-tap="true"
              >
                Tap
              </Button>
              <span className="min-h-5 text-sm text-muted" data-last-hit="true">
                {lastHit === null ? '' : offsetText(lastHit)}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Score" description="Live for the current run.">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">Hits</dt>
              <dd className="font-mono text-lg" data-trainer-hits="true">{score.hits}</dd>
            </div>
            <div>
              <dt className="text-muted">On beat</dt>
              <dd className="font-mono text-lg" data-onbeat-pct="true">{score.onBeatPct}%</dd>
            </div>
            <div>
              <dt className="text-muted">Average offset</dt>
              <dd className="font-mono text-lg" data-average-offset="true">
                {score.hits === 0 ? '—' : `${score.averageMs > 0 ? '+' : ''}${score.averageMs} ms`}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Consistency (σ)</dt>
              <dd className="font-mono text-lg" data-consistency="true">{score.consistencyMs} ms</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm font-medium text-accent" data-advice="true">
            {score.advice}
          </p>
        </Card>

        <Card
          title="Recent runs"
          description="Saved scores, newest first."
          actions={
            <Button variant="secondary" size="sm" disabled={saving || score.hits < 4} onClick={() => void handleSave()} data-trainer-save="true">
              {saving ? 'Saving…' : 'Save run'}
            </Button>
          }
        >
          {runs.length === 0 ? (
            <p className="text-sm text-muted">No saved runs yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm" data-runs-list="true">
              {runs.map((run) => (
                <li key={run.id} className="font-mono">
                  {run.bpm} BPM · {run.hits} hits · {run.onBeatPct}% on beat · avg{' '}
                  {run.averageMs > 0 ? '+' : ''}{run.averageMs} ms · σ {run.consistencyMs} ms
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  )
}
