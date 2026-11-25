import { useState } from 'react'
import { createFileRoute, Link, notFound, useRouter } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import type { Exercise, ExerciseProgress, RecordingSummary, UpdateExerciseInput } from '#/lib/types'
import { bpmGraphPoints } from '#/lib/progress'
import { formatClock, formatUtcDateTime } from '#/lib/sessions'
import {
  deleteExercise,
  getActiveSession,
  getExercise,
  getReferenceRecording,
  listProgress,
  logProgress,
  updateExercise,
} from '#/server/api'
import { BpmGraph } from '#/components/bpm-graph'
import { ExerciseForm } from '#/components/exercise-form'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/exercises/$exerciseId')({
  component: ExercisePage,
  loader: async ({ params }) => {
    const id = Number(params.exerciseId)
    const [exercise, progress, active, referenceTake] = await Promise.all([
      getExercise({ data: { id } }),
      listProgress({ data: { id } }),
      getActiveSession(),
      getReferenceRecording({ data: { id } }),
    ])
    if (!exercise) throw notFound()
    return { exercise, progress, activeSessionName: active?.templateName ?? null, referenceTake }
  },
})

interface LoaderData {
  exercise: Exercise
  progress: ExerciseProgress[]
  activeSessionName: string | null
  referenceTake: RecordingSummary | null
}

function ExercisePage() {
  const router = useRouter()
  const { exercise, progress, activeSessionName, referenceTake } =
    Route.useLoaderData() as LoaderData
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const points = exercise.hasTiming ? bpmGraphPoints(progress) : []

  async function handleDelete() {
    setConfirmingDelete(false)
    try {
      await deleteExercise({ data: { id: exercise.id } })
      router.navigate({ to: '/exercises' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the exercise.')
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={exercise.name}
        description={`${exercise.hasTiming ? 'Timed' : 'Untimed'} · Difficulty ${exercise.difficulty}/5`}
        actions={
          <div className="flex items-center gap-2">
            {exercise.isBuiltin ? (
              <Badge variant="accent">Built-in · read-only</Badge>
            ) : confirmingDelete ? (
              <>
                <Button variant="danger" size="sm" onClick={() => void handleDelete()}>
                  Confirm delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setError(null)
                    setEditing(true)
                  }}
                >
                  <Pencil className="size-4" aria-hidden="true" /> Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  aria-label={`Delete exercise ${exercise.name}`}
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </>
            )}
          </div>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {editing ? (
        <ExerciseForm
          initial={exercise}
          submitLabel="Save changes"
          onSubmit={async (input) => {
            const payload: UpdateExerciseInput = { ...input, id: exercise.id }
            await updateExercise({ data: payload })
            setEditing(false)
            router.invalidate()
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {(exercise.tags.length > 0 || exercise.tabText !== '') && (
            <Card title="Details">
              <div className="flex flex-col gap-3">
                {exercise.tags.length > 0 ? (
                  <ol className="flex flex-wrap gap-2 text-sm">
                    {exercise.tags.map((tag) => (
                      <li key={tag} className="rounded-full border border-line bg-raised px-3 py-1">
                        {tag}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {exercise.tabText !== '' ? (
                  <pre className="overflow-x-auto rounded-lg border border-line bg-raised p-3 font-mono text-sm whitespace-pre">
                    {exercise.tabText}
                  </pre>
                ) : null}
              </div>
            </Card>
          )}

          {referenceTake ? (
            <Card title="Reference take" description="The take you are measuring against.">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{referenceTake.name}</span>
                <span className="text-muted tabular-nums">
                  {formatClock(referenceTake.durationSeconds)}
                </span>
                <Link
                  to="/recordings"
                  search={{ exercise: exercise.id }}
                  className="ml-auto text-accent underline"
                >
                  Open recordings
                </Link>
              </div>
            </Card>
          ) : null}

          <Card title="Progress" description={exercise.hasTiming ? 'Max clean BPM over time.' : 'Completions and self-ratings.'}>
            <div data-log-count={progress.length} className="flex flex-col gap-4">
              {exercise.hasTiming && points.length > 0 ? (
                <BpmGraph points={points} />
              ) : null}
              {exercise.hasTiming && points.length === 0 ? (
                <p className="text-sm text-muted">No timed progress logged yet.</p>
              ) : null}

              <LogForm
                exerciseId={exercise.id}
                hasTiming={exercise.hasTiming}
                activeSessionName={activeSessionName}
                onError={setError}
                onLogged={() => router.invalidate()}
              />

              {progress.length === 0 ? (
                <p className="text-sm text-muted">Nothing logged yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {progress.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-col gap-2 rounded-lg border border-line bg-raised px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{describeEntry(entry)}</span>
                        <span className="text-xs text-muted">{formatUtcDateTime(entry.completedAt)}</span>
                      </div>
                      {entry.notes !== '' ? (
                        <p className="text-muted">{entry.notes}</p>
                      ) : null}
                      {entry.sessionName ? (
                        <Badge variant="teal">{entry.sessionName}</Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}
    </main>
  )
}

function describeEntry(entry: ExerciseProgress): string {
  if (entry.maxCleanBpm !== null) {
    const parts = [`${entry.maxCleanBpm} BPM max`]
    if (entry.avgBpm !== null) parts.push(`avg ${entry.avgBpm}`)
    if (entry.durationSeconds > 0) parts.push(formatClock(entry.durationSeconds))
    if (entry.cleanStreak !== null && entry.cleanStreak > 0) parts.push(`streak ${entry.cleanStreak}`)
    return parts.join(' · ')
  }
  const parts = [`Rated ${entry.selfRating}/5`]
  if (entry.durationSeconds > 0) parts.push(formatClock(entry.durationSeconds))
  return parts.join(' · ')
}

function LogForm({
  exerciseId,
  hasTiming,
  activeSessionName,
  onError,
  onLogged,
}: {
  exerciseId: number
  hasTiming: boolean
  activeSessionName: string | null
  onError: (message: string) => void
  onLogged: () => void
}) {
  const [maxBpm, setMaxBpm] = useState('')
  const [avgBpm, setAvgBpm] = useState('')
  const [duration, setDuration] = useState('')
  const [streak, setStreak] = useState('')
  const [rating, setRating] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  function parseOptionalInt(value: string, label: string): number | undefined {
    if (value.trim() === '') return undefined
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`${label} must be a whole number of seconds.`)
    }
    return parsed
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      let maxCleanBpm: number | undefined
      if (hasTiming) {
        const parsed = Number(maxBpm)
        if (maxBpm.trim() === '' || !Number.isInteger(parsed) || parsed < 1 || parsed > 999) {
          onError('Max clean BPM is required and must be between 1 and 999.')
          return
        }
        maxCleanBpm = parsed
      }
      if (!hasTiming && rating === '') {
        onError('A self rating is required for untimed exercises.')
        return
      }

      await logProgress({
        data: {
          exerciseId,
          ...(hasTiming
            ? {
                maxCleanBpm,
                avgBpm: parseOptionalInt(avgBpm, 'Avg BPM'),
                cleanStreak: parseOptionalInt(streak, 'Clean streak'),
              }
            : { selfRating: Number(rating) }),
          durationSeconds: parseOptionalInt(duration, 'Duration') ?? 0,
          notes,
        },
      })
      setMaxBpm('')
      setAvgBpm('')
      setDuration('')
      setStreak('')
      setRating('')
      setNotes('')
      onLogged()
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Could not log the progress.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-line pt-4">
      {activeSessionName ? (
        <p className="text-xs text-muted">
          Will be logged against the active session: {activeSessionName}
        </p>
      ) : null}

      <div className={hasTiming ? 'grid grid-cols-2 gap-3 sm:grid-cols-4' : 'grid grid-cols-1 gap-3 sm:grid-cols-2'}>
        {hasTiming ? (
          <>
            <Field label="Max clean BPM" htmlFor="log-max-bpm">
              <input
                id="log-max-bpm"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={maxBpm}
                onChange={(event) => setMaxBpm(event.target.value)}
                className={controlClass}
              />
            </Field>
            <Field label="Avg BPM" htmlFor="log-avg-bpm">
              <input
                id="log-avg-bpm"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={avgBpm}
                onChange={(event) => setAvgBpm(event.target.value)}
                className={controlClass}
              />
            </Field>
          </>
        ) : (
          <Field label="Self rating" htmlFor="log-rating">
            <select
              id="log-rating"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              className={controlClass}
            >
              <option value="">Select…</option>
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>
                  {level}/5
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Duration (seconds)" htmlFor="log-duration">
          <input
            id="log-duration"
            type="number"
            inputMode="numeric"
            min={0}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className={controlClass}
          />
        </Field>
        {hasTiming ? (
          <Field label="Clean streak" htmlFor="log-streak">
            <input
              id="log-streak"
              type="number"
              inputMode="numeric"
              min={0}
              value={streak}
              onChange={(event) => setStreak(event.target.value)}
              className={controlClass}
            />
          </Field>
        ) : null}
      </div>

      <Field label="Notes" htmlFor="log-notes">
        <textarea
          id="log-notes"
          rows={2}
          maxLength={4000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. Clean until bar 3, then rushed"
          className={controlClass}
        />
      </Field>

      <Button type="submit" disabled={busy}>
        Log progress
      </Button>
    </form>
  )
}
