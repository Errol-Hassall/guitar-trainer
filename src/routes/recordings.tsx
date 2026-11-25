import { useRef, useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Play, Star, Trash2 } from 'lucide-react'
import type { RecordingSummary } from '#/lib/types'
import { bytesToBase64 } from '#/lib/audio'
import { formatClock, formatUtcDateTime } from '#/lib/sessions'
import {
  createRecording,
  deleteRecording,
  getActiveSession,
  listExercises,
  listRecordings,
  setReference,
} from '#/server/api'
import { describeMicError } from '#/components/audio/mic'
import { RecordingPlayer } from '#/components/recording-player'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/recordings')({
  component: RecordingsPage,
  validateSearch: (search: Record<string, unknown>): { exercise?: number } => ({
    exercise:
      typeof search.exercise === 'string' && search.exercise !== ''
        ? Number(search.exercise)
        : undefined,
  }),
  loader: async () => {
    // The full list is small; the exercise filter is applied client-side
    // because the loader context does not expose search params.
    const [recordings, exercises, active] = await Promise.all([
      listRecordings({ data: {} }),
      listExercises(),
      getActiveSession(),
    ])
    return {
      recordings,
      exercises,
      activeSession: active ? { id: active.id, name: active.templateName } : null,
    }
  },
})

interface LoaderData {
  recordings: RecordingSummary[]
  exercises: { id: number; name: string }[]
  activeSession: { id: number; name: string } | null
}

function RecordingsPage() {
  const router = useRouter()
  const { recordings, exercises, activeSession } = Route.useLoaderData() as LoaderData
  const search = Route.useSearch()
  const visibleRecordings =
    search.exercise === undefined
      ? recordings
      : recordings.filter((recording) => recording.exerciseId === search.exercise)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const queueRef = useRef<number[] | null>(null)
  const [name, setName] = useState(`Take ${recordings.length + 1}`)
  const [exerciseTag, setExerciseTag] = useState(search.exercise ? String(search.exercise) : '')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const elapsedRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      elapsedRef.current = 0
      setElapsed(0)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        void saveRecording(recorder.mimeType || 'audio/webm')
      }
      recorder.start(1000)
      recorderRef.current = recorder
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 0.5
        setElapsed(Math.floor(elapsedRef.current))
      }, 500)
    } catch (cause) {
      setError(describeMicError(cause))
    }
  }

  function stopRecording() {
    if (timerRef.current !== null) clearInterval(timerRef.current)
    timerRef.current = null
    setRecording(false)
    recorderRef.current?.stop()
    recorderRef.current = null
  }

  async function saveRecording(mime: string) {
    try {
      const blob = new Blob(chunksRef.current, { type: mime })
      const dataB64 = bytesToBase64(new Uint8Array(await blob.arrayBuffer()))
      await createRecording({
        data: {
          name: name.trim() === '' ? 'Take' : name.trim(),
          mime,
          dataB64,
          durationSeconds: Math.round(elapsedRef.current),
          sessionId: activeSession?.id ?? null,
          exerciseId: exerciseTag === '' ? null : Number(exerciseTag),
        },
      })
      setName((current) => `Take ${Number(/\d+$/.exec(current)?.[0] ?? 0) + 1}`)
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the recording.')
    }
  }

  async function handleDelete(id: number) {
    setConfirmingId(null)
    try {
      await deleteRecording({ data: { id } })
      if (selectedId === id) setSelectedId(null)
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the recording.')
    }
  }

  async function handleReference(recording: RecordingSummary) {
    try {
      await setReference({
        data: { recordingId: recording.id, exerciseId: recording.exerciseId as number },
      })
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not set the reference take.')
    }
  }

  function playCompare(a: number, b: number) {
    queueRef.current = [a, b]
    setSelectedId(a)
  }

  function handleEnded() {
    const queue = queueRef.current
    if (queue && queue.length > 1) {
      queue.shift()
      setSelectedId(queue[0])
    } else {
      queueRef.current = null
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Recordings"
        description="One-tap takes, tagged to the active session and an exercise."
      />

      {error !== '' ? (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <Card
          title="Record a take"
          description={
            activeSession
              ? `Will be tagged to the active session: ${activeSession.name}`
              : 'No active session — the take will be untagged.'
          }
        >
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Name" htmlFor="recording-name">
              <input
                id="recording-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={`${controlClass} w-40`}
              />
            </Field>
            <Field label="Exercise" htmlFor="recording-exercise">
              <select
                id="recording-exercise"
                value={exerciseTag}
                onChange={(event) => setExerciseTag(event.target.value)}
                className={`${controlClass} w-48`}
              >
                <option value="">No exercise</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </Field>
            {recording ? (
              <Button variant="danger" size="lg" onClick={stopRecording}>
                Stop · {formatClock(elapsed)}
              </Button>
            ) : (
              <Button size="lg" onClick={() => void startRecording()}>
                Record
              </Button>
            )}
          </div>
        </Card>

        <Card
          title="Takes"
          description={
            search.exercise !== undefined ? (
              <>
                Filtered by exercise{' '}
                <Link to="/recordings" className="text-accent underline">
                  show all
                </Link>
              </>
            ) : undefined
          }
        >
          <ul data-recording-count={visibleRecordings.length} className="flex flex-col gap-2">
            {visibleRecordings.length === 0 ? (
              <p className="text-sm text-muted">No recordings yet.</p>
            ) : (
              visibleRecordings.map((recording) => (
                <li
                  key={recording.id}
                  data-recording-id={recording.id}
                  data-recording-reference={recording.isReference ? 'true' : 'false'}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{recording.name}</p>
                    <p className="text-xs text-muted tabular-nums">
                      {formatClock(recording.durationSeconds)} ·{' '}
                      {formatUtcDateTime(recording.createdAt)}
                    </p>
                  </div>
                  {recording.isReference ? <Badge variant="accent">Reference</Badge> : null}
                  {recording.sessionName ? <Badge variant="teal">{recording.sessionName}</Badge> : null}
                  {recording.exerciseName ? <Badge>{recording.exerciseName}</Badge> : null}
                  <Button size="sm" onClick={() => setSelectedId(recording.id)}>
                    <Play className="size-3.5" aria-hidden="true" /> Play
                  </Button>
                  {recording.exerciseId !== null ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Set ${recording.name} as the reference take`}
                      onClick={() => void handleReference(recording)}
                    >
                      <Star className={recording.isReference ? 'size-3.5 fill-current' : 'size-3.5'} aria-hidden="true" />
                    </Button>
                  ) : null}
                  {confirmingId === recording.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => void handleDelete(recording.id)}>
                        Confirm
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmingId(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${recording.name}`}
                      onClick={() => setConfirmingId(recording.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))
            )}
          </ul>

          {visibleRecordings.length >= 2 ? (
            <CompareBar recordings={visibleRecordings} onPlay={playCompare} />
          ) : null}
        </Card>

        {selectedId !== null ? (
          <Card title="Playback">
            <RecordingPlayer recordingId={selectedId} onEnded={handleEnded} />
          </Card>
        ) : null}
      </div>
    </main>
  )
}

function CompareBar({
  recordings,
  onPlay,
}: {
  recordings: RecordingSummary[]
  onPlay: (a: number, b: number) => void
}) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
      <Field label="Take A" htmlFor="compare-a">
        <select id="compare-a" value={a} onChange={(event) => setA(event.target.value)} className={`${controlClass} w-44`}>
          <option value="">Select…</option>
          {recordings.map((recording) => (
            <option key={recording.id} value={recording.id}>
              {recording.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Take B" htmlFor="compare-b">
        <select id="compare-b" value={b} onChange={(event) => setB(event.target.value)} className={`${controlClass} w-44`}>
          <option value="">Select…</option>
          {recordings.map((recording) => (
            <option key={recording.id} value={recording.id}>
              {recording.name}
            </option>
          ))}
        </select>
      </Field>
      <Button disabled={a === '' || b === '' || a === b} onClick={() => onPlay(Number(a), Number(b))}>
        Play A → B
      </Button>
    </div>
  )
}

