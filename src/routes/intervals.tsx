import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { INTERVALS, type IntervalName } from '#/lib/ear'
import type { IntervalNote } from '#/lib/types'
import { playMidiNotes } from '#/components/ear/synth'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'
import { listIntervalNotes, removeIntervalNote, saveIntervalNote } from '#/server/api'

export const Route = createFileRoute('/intervals')({
  component: IntervalsPage,
  loader: () => listIntervalNotes(),
})

function IntervalsPage() {
  const router = useRouter()
  const notes = Route.useLoaderData() as IntervalNote[]
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  function savedFor(name: IntervalName): IntervalNote | undefined {
    return notes.find((item) => item.name === name)
  }

  async function play(semitones: number) {
    setError('')
    try {
      // C4 root so every interval sits in a comfortable ear range.
      await playMidiNotes([60, 60 + semitones], { noteDuration: 0.4, gap: 0.15 })
    } catch {
      setError('Audio is not available in this browser.')
    }
  }

  async function handleSave(name: IntervalName) {
    setError('')
    try {
      await saveIntervalNote({ data: { name, note: drafts[name] ?? '' } })
      setDrafts((current) => {
        const next = { ...current }
        delete next[name]
        return next
      })
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the note.')
    }
  }

  async function handleRemove(name: IntervalName) {
    setError('')
    try {
      await removeIntervalNote({ data: { name } })
      setDrafts((current) => {
        const next = { ...current }
        delete next[name]
        return next
      })
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove the note.')
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Interval notebook"
        description="The ten standard intervals with audio. Add the ones you have learned, with a note of your own."
      />
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {INTERVALS.map((interval) => {
          const saved = savedFor(interval.name)
          const draft = drafts[interval.name] ?? saved?.note ?? ''
          const dirty = (drafts[interval.name] ?? '') !== (saved?.note ?? '')
          return (
            <Card
              key={interval.name}
              title={interval.name}
              description={`${interval.semitones} semitones from the root`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void play(interval.semitones)}
                    data-interval-play
                  >
                    Play
                  </Button>
                  {saved && <Badge variant="teal">In notebook</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    aria-label={`Note for ${interval.name}`}
                    value={draft}
                    maxLength={200}
                    placeholder="Why you learned it, how it feels…"
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [interval.name]: event.target.value }))
                    }
                    className={`${controlClass} min-w-40 flex-1`}
                  />
                  <Button size="sm" onClick={() => void handleSave(interval.name)} disabled={!dirty}>
                    Save
                  </Button>
                  {saved && (
                    <Button variant="ghost" size="sm" onClick={() => void handleRemove(interval.name)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </main>
  )
}
