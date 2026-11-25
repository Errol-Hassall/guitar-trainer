import { useEffect, useRef, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import {
  Check,
  Flag,
  Pause,
  Play,
  SkipForward,
} from 'lucide-react'
import type { PracticeSession } from '#/lib/types'
import {
  firstIncompleteIndex,
  formatClock,
  formatDuration,
  sessionKindLabel,
  sumElapsedSeconds,
} from '#/lib/sessions'
import {
  completeSection,
  completeSession,
  saveSectionNotes,
  setAutoAdvance as setAutoAdvanceFn,
} from '#/server/api'
import { getAudioContext, playChime } from './metronome/audio'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Field, controlClass } from './ui/field'
import { Progress } from './ui/progress'
import { useWakeLock } from './hooks/use-wake-lock'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function SessionTimer({
  session,
  oneThing,
}: {
  session: PracticeSession
  oneThing: string
}) {
  const [sections, setSections] = useState(session.sections)
  const [currentIndex, setCurrentIndex] = useState(() =>
    firstIncompleteIndex(session.sections),
  )
  const [remaining, setRemaining] = useState(() => {
    const index = firstIncompleteIndex(session.sections)
    const section = session.sections[index]
    return section ? section.plannedSeconds - section.elapsedSeconds : 0
  })
  const [running, setRunning] = useState(false)
  const [awaitingNext, setAwaitingNext] = useState(false)
  const [finishedEarly, setFinishedEarly] = useState(session.status === 'completed')
  const [autoAdvance, setAutoAdvanceLocal] = useState(session.autoAdvance)
  const [notes, setNotes] = useState(() => {
    const index = firstIncompleteIndex(session.sections)
    return session.sections[index]?.notes ?? ''
  })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  const sectionsRef = useRef(sections)
  sectionsRef.current = sections
  const currentIndexRef = useRef(currentIndex)
  currentIndexRef.current = currentIndex
  const autoAdvanceRef = useRef(autoAdvance)
  autoAdvanceRef.current = autoAdvance
  const remainingRef = useRef(remaining)
  const deadlineRef = useRef<number | null>(null)
  const advanceTimerRef = useRef<number | null>(null)

  const current = sections[currentIndex]
  const allDone = currentIndex === -1
  const showSummary = finishedEarly || allDone

  useWakeLock(running && !showSummary)

  function startTimer() {
    deadlineRef.current = Date.now() + remainingRef.current * 1000
    setRunning(true)
  }

  function pauseTimer() {
    if (deadlineRef.current !== null) {
      remainingRef.current = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      )
    }
    setRemaining(remainingRef.current)
    setRunning(false)
  }

  function goToSection(index: number, autostart: boolean) {
    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
    const section = sectionsRef.current[index]
    if (!section) return
    setCurrentIndex(index)
    setAwaitingNext(false)
    setError(null)
    setNotes(section.notes)
    setSaveStatus('idle')
    remainingRef.current = section.plannedSeconds - section.elapsedSeconds
    setRemaining(remainingRef.current)
    if (autostart) startTimer()
  }

  async function handleCompleteSection() {
    const index = currentIndexRef.current
    const section = sectionsRef.current[index]
    if (!section || section.completedAt !== null) return
    setRunning(false)
    try {
      playChime(getAudioContext())
    } catch {
      // Audio is best-effort; the timer must still advance.
    }
    const elapsed = Math.max(0, section.plannedSeconds - remainingRef.current)
    setBusy(true)
    setError(null)
    try {
      const result = await completeSection({
        data: { sectionId: section.id, elapsedSeconds: elapsed },
      })
      const updated = sectionsRef.current.map((value) =>
        value.id === section.id
          ? { ...value, completedAt: new Date().toISOString(), elapsedSeconds: elapsed }
          : value,
      )
      setSections(updated)
      if (result.sessionCompleted) {
        setFinishedEarly(true)
        // Refresh route data so the completed state (and mood prompt) shows.
        void router.invalidate()
        return
      }
      const nextIndex = firstIncompleteIndex(updated)
      setAwaitingNext(true)
      if (autoAdvanceRef.current && nextIndex !== -1) {
        advanceTimerRef.current = window.setTimeout(
          () => goToSection(nextIndex, true),
          1500,
        )
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not finish the section.')
    } finally {
      setBusy(false)
    }
  }

  const completeRef = useRef(handleCompleteSection)
  completeRef.current = handleCompleteSection

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      if (deadlineRef.current === null) return
      const left = Math.ceil((deadlineRef.current - Date.now()) / 1000)
      remainingRef.current = Math.max(0, left)
      setRemaining(remainingRef.current)
      if (left <= 0) {
        setRunning(false)
        void completeRef.current()
      }
    }, 250)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) clearTimeout(advanceTimerRef.current)
    }
  }, [])

  async function handleSaveNotes() {
    const section = sectionsRef.current[currentIndexRef.current]
    if (!section) return
    setSaveStatus('saving')
    try {
      await saveSectionNotes({ data: { sectionId: section.id, notes } })
      setSections((previous) =>
        previous.map((value) =>
          value.id === section.id ? { ...value, notes } : value,
        ),
      )
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  function handleAutoAdvanceChange(value: boolean) {
    setAutoAdvanceLocal(value)
    void setAutoAdvanceFn({ data: { sessionId: session.id, autoAdvance: value } }).catch(
      () => setError('Could not save the auto-advance setting.'),
    )
  }

  async function handleFinish() {
    setBusy(true)
    setError(null)
    try {
      await completeSession({ data: { id: session.id } })
      setRunning(false)
      setFinishedEarly(true)
      void router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not end the session.')
    } finally {
      setBusy(false)
    }
  }

  if (showSummary) {
    return (
      <div data-session-status="completed" className="flex flex-col gap-4">
        <Card title="Session complete" description={session.templateName}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Theme</dt>
              <dd>{session.theme}</dd>
            </div>
            <div>
              <dt className="text-muted">Type</dt>
              <dd>{sessionKindLabel(session.kind)}</dd>
            </div>
            <div>
              <dt className="text-muted">Practiced</dt>
              <dd>{formatDuration(sumElapsedSeconds(sections))}</dd>
            </div>
            <div>
              <dt className="text-muted">Sections done</dt>
              <dd>
                {sections.filter((value) => value.completedAt !== null).length} of{' '}
                {sections.length}
              </dd>
            </div>
          </dl>
        </Card>

        {sections.length > 0 ? (
          <Card title="Areas">
            <ul className="flex flex-col gap-2 text-sm">
              {sections.map((section) => (
                <li key={section.id} className="rounded-lg border border-line bg-raised px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{section.name}</span>
                    {section.completedAt ? (
                      <Badge variant="success">done</Badge>
                    ) : (
                      <Badge>skipped</Badge>
                    )}
                  </div>
                  {section.notes !== '' ? (
                    <p className="mt-1 whitespace-pre-wrap text-muted">{section.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Link to="/" className="text-sm text-accent underline">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div
      data-session-status="active"
      data-current-section={currentIndex + 1}
      data-timer-running={String(running)}
      className="flex flex-col gap-4"
    >
      {oneThing !== '' ? (
        <Card title="One thing to fix this week">
          <p className="whitespace-pre-wrap text-sm">{oneThing}</p>
        </Card>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Card
        title={`Section ${currentIndex + 1} of ${sections.length}`}
        description={current?.name}
        actions={
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(event) => handleAutoAdvanceChange(event.target.checked)}
              className="size-5 accent-[var(--color-accent)]"
            />
            Auto-advance
          </label>
        }
      >
        <div className="flex flex-col gap-5">
          <p data-timer-seconds={remaining} className="font-mono text-6xl font-semibold tabular-nums sm:text-7xl">
            {formatClock(remaining)}
          </p>
          <Progress
            value={current ? current.plannedSeconds - remaining : 0}
            max={current?.plannedSeconds ?? 1}
            label="Section progress"
          />

          {awaitingNext && !running ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-teal/40 bg-teal/10 px-3 py-2">
              <span className="text-sm text-teal">Section complete.</span>
              <Button
                variant="secondary"
                onClick={() => {
                  const next = firstIncompleteIndex(sectionsRef.current)
                  if (next !== -1) goToSection(next, false)
                }}
              >
                Next section
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {running ? (
              <Button size="lg" onClick={pauseTimer}>
                <Pause className="size-5" aria-hidden="true" /> Pause
              </Button>
            ) : (
              <Button size="lg" onClick={startTimer} disabled={awaitingNext || busy}>
                <Play className="size-5" aria-hidden="true" /> Start
              </Button>
            )}
            <Button
              variant="secondary"
              size="lg"
              onClick={() => void handleCompleteSection()}
              disabled={busy}
            >
              <SkipForward className="size-5" aria-hidden="true" /> Skip section
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={() => void handleFinish()}
              disabled={busy}
            >
              <Flag className="size-5" aria-hidden="true" /> End session
            </Button>
          </div>
        </div>
      </Card>

      {current ? (
        <Card title={`Notes for ${current.name}`}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleSaveNotes()
            }}
          >
            <Field label="What did you work on?" htmlFor="section-notes">
              <textarea
                id="section-notes"
                rows={3}
                maxLength={4000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g. Strummed to the backing track at 92 BPM…"
                className={`${controlClass} min-h-24 py-2`}
              />
            </Field>
            <div className="mt-3 flex items-center gap-3" data-save-status={saveStatus}>
              <Button type="submit" disabled={saveStatus === 'saving'}>
                Save notes
              </Button>
              {saveStatus === 'saved' ? (
                <span className="text-sm text-success">Saved.</span>
              ) : null}
              {saveStatus === 'error' ? (
                <span role="alert" className="text-sm text-danger">
                  Could not save the notes.
                </span>
              ) : null}
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Plan">
        <ol className="flex flex-col gap-2 text-sm">
          {sections.map((section, index) => (
            <li
              key={section.id}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                index === currentIndex
                  ? 'border-accent bg-accent/10'
                  : 'border-line bg-raised'
              }`}
            >
              <span className="flex items-center gap-2">
                {section.completedAt ? (
                  <Check className="size-4 text-success" aria-hidden="true" />
                ) : (
                  <span className="size-4 rounded-full border border-line" aria-hidden="true" />
                )}
                {index + 1}. {section.name}
              </span>
              <span className="text-muted">{formatClock(section.plannedSeconds)}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
