import { useRef, useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import type { EarDrillId, EarQuestion } from '#/lib/ear'
import { EAR_DRILL_IDS, EAR_DRILLS, ROUND_LENGTH, makePhrase, makeQuestion, midiName } from '#/lib/ear'
import type { PracticeSession } from '#/lib/types'
import { bytesToBase64 } from '#/lib/audio'
import { describeMicError } from '#/components/audio/mic'
import { playMidiNotes, type PlayNotesOptions } from '#/components/ear/synth'
import { RecordingPlayer } from '#/components/recording-player'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { PageHeader } from '#/components/ui/page-header'
import { createRecording, getActiveSession, logEarRound } from '#/server/api'

export const Route = createFileRoute('/ear/$drill')({
  validateSearch: (search: Record<string, unknown>) => ({
    level: Number(search.level ?? 1) === 2 ? 2 : 1,
  }),
  loader: async ({ params }) => {
    if (!EAR_DRILL_IDS.includes(params.drill as EarDrillId)) throw notFound()
    return getActiveSession()
  },
  component: EarDrillPage,
})

const DRILL_PLAYBACK: Record<string, PlayNotesOptions> = {
  intervals: { noteDuration: 0.5, gap: 0.15 },
  'scale-degrees': { noteDuration: 0.5, gap: 0.15 },
  'chord-quality': { noteDuration: 0.35, gap: 0.12 },
  progressions: { noteDuration: 0.25, gap: 0.08 },
  transcription: { noteDuration: 0.5, gap: 0.25 },
}

function EarDrillPage() {
  const { drill } = Route.useParams() as { drill: EarDrillId }
  const definition = EAR_DRILLS.find((item) => item.id === drill)!
  if (drill === 'transcription') return <TranscriptionDrill />
  return <QuizDrill drill={drill} definitionName={definition.name} />
}

function QuizDrill({ drill, definitionName }: { drill: EarDrillId; definitionName: string }) {
  const level = Route.useSearch().level
  const [question, setQuestion] = useState<EarQuestion>(() => makeQuestion(drill, level))
  const [count, setCount] = useState(1)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState('')
  const [logging, setLogging] = useState(false)
  // Gamification data per round: when the question was shown and the streak of
  // consecutive correct answers (best kept separately so a wrong answer resets
  // the run but not the record).
  const askedAtRef = useRef(Date.now())
  const roundStreakRef = useRef(0)
  const bestStreakRef = useRef(0)
  const responseMsTotalRef = useRef(0)

  async function play() {
    setError('')
    try {
      await playMidiNotes(question.notes, DRILL_PLAYBACK[drill])
    } catch {
      setError('Audio is not available in this browser.')
    }
  }

  function pick(index: number) {
    if (picked !== null) return
    const isCorrect = index === question.answerIndex
    setPicked(index)
    if (isCorrect) setScore((current) => current + 1)
    responseMsTotalRef.current += Math.max(0, Date.now() - askedAtRef.current)
    roundStreakRef.current = isCorrect ? roundStreakRef.current + 1 : 0
    bestStreakRef.current = Math.max(bestStreakRef.current, roundStreakRef.current)
  }

  async function next() {
    if (picked === null || logging) return
    if (count < ROUND_LENGTH) {
      setQuestion(makeQuestion(drill, level))
      askedAtRef.current = Date.now()
      setPicked(null)
      setCount((current) => current + 1)
      return
    }
    setLogging(true)
    try {
      await logEarRound({
        data: {
          drill,
          level,
          correct: score,
          total: ROUND_LENGTH,
          bestStreak: bestStreakRef.current,
          totalResponseMs: responseMsTotalRef.current,
        },
      })
      setFinished(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your round.')
    } finally {
      setLogging(false)
    }
  }

  function restart() {
    setQuestion(makeQuestion(drill, level))
    askedAtRef.current = Date.now()
    roundStreakRef.current = 0
    bestStreakRef.current = 0
    responseMsTotalRef.current = 0
    setCount(1)
    setPicked(null)
    setScore(0)
    setFinished(false)
    setError('')
  }

  if (finished) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader title={definitionName} description="Round complete." />
        <Card title={`You got ${score}/${ROUND_LENGTH} correct`}>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/ear">
              <Button variant="secondary">All drills</Button>
            </Link>
            <Button onClick={restart}>Practice again</Button>
          </div>
        </Card>
      </main>
    )
  }

  const correct = picked !== null && picked === question.answerIndex

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title={definitionName}
        description={`Question ${count} of ${ROUND_LENGTH}. Listen as many times as you need.`}
      />
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <Card title={`Question ${count}`}>
        <div className="flex flex-col gap-4">
          <Button onClick={() => void play()} data-ear-play>
            Play
          </Button>
          <div data-ear-options className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {question.options.map((option, index) => (
              <Button
                key={option}
                variant={picked === null ? 'secondary' : index === question.answerIndex ? 'primary' : 'ghost'}
                disabled={picked !== null}
                onClick={() => pick(index)}
              >
                {option}
              </Button>
            ))}
          </div>
          {picked !== null && (
            <p
              role="status"
              data-ear-feedback={correct ? 'correct' : 'wrong'}
              className={`rounded-lg px-3 py-2 text-sm ${correct ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}
            >
              {correct ? 'Correct!' : `It was ${question.options[question.answerIndex]}.`}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button onClick={() => void next()} disabled={picked === null || logging}>
              Next
            </Button>
            <Link to="/ear">
              <Button variant="ghost" size="sm">
                Quit round
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </main>
  )
}

function TranscriptionDrill() {
  const activeSession = Route.useLoaderData() as PracticeSession | null
  const [phrase, setPhrase] = useState<number[]>(() => makePhrase())
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState<number | null>(null)
  const [recording, setRecording] = useState(false)
  const [takeNumber, setTakeNumber] = useState(1)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const elapsedRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  async function play() {
    setError('')
    try {
      await playMidiNotes(phrase, DRILL_PLAYBACK.transcription)
    } catch {
      setError('Audio is not available in this browser.')
    }
  }

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      elapsedRef.current = 0
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        void saveTake(recorder.mimeType || 'audio/webm')
      }
      recorder.start(1000)
      recorderRef.current = recorder
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 0.5
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

  async function saveTake(mime: string) {
    try {
      const blob = new Blob(chunksRef.current, { type: mime })
      const dataB64 = bytesToBase64(new Uint8Array(await blob.arrayBuffer()))
      const saved = await createRecording({
        data: {
          name: `Ear take ${takeNumber}`,
          mime,
          dataB64,
          durationSeconds: Math.round(elapsedRef.current),
          sessionId: activeSession?.id ?? null,
        },
      })
      setSavedId(saved.id)
      setTakeNumber((current) => current + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the take.')
    }
  }

  function nextPhrase() {
    setPhrase(makePhrase())
    setRevealed(false)
    setSavedId(null)
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title="Transcription"
        description="Sing the phrase first, then find it on the guitar. Record a take to check yourself."
      />
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <Card title={`${phrase.length} notes`}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void play()} data-ear-play>
              Play phrase
            </Button>
            {recording ? (
              <Button variant="danger" onClick={stopRecording}>
                Stop &amp; save take
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => void startRecording()}>
                Record my attempt
              </Button>
            )}
            {!revealed ? (
              <Button variant="ghost" size="sm" onClick={() => setRevealed(true)}>
                Reveal notes
              </Button>
            ) : (
              <Badge variant="accent">{phrase.map(midiName).join(' · ')}</Badge>
            )}
          </div>
          {revealed && (
            <p className="text-sm text-muted">
              Sing it again from memory, then play those notes on the guitar.
            </p>
          )}
          {savedId !== null && (
            <div className="flex flex-col gap-2">
              <RecordingPlayer recordingId={savedId} />
              <Link to="/recordings" className="text-sm text-accent underline">
                All recordings
              </Link>
            </div>
          )}
          <Button variant="secondary" onClick={nextPhrase}>
            Next phrase
          </Button>
        </div>
      </Card>
    </main>
  )
}
