import { useState } from 'react'
import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import type { MetronomePreset, Mood, PracticeSession } from '#/lib/types'
import { MOODS } from '#/lib/types'
import { formatUtcDateTime, sessionKindLabel } from '#/lib/sessions'
import {
  deletePreset,
  getSession,
  getOneThing,
  listPresets,
  savePreset,
  setSessionMood,
} from '#/server/api'
import { MetronomePanel } from '#/components/metronome-panel'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { PageHeader } from '#/components/ui/page-header'
import { SessionTimer } from '#/components/session-timer'

export const Route = createFileRoute('/sessions/$sessionId')({
  component: SessionPage,
  loader: async ({ params }) => {
    const [session, oneThing, presets] = await Promise.all([
      getSession({ data: { id: Number(params.sessionId) } }),
      getOneThing(),
      listPresets(),
    ])
    if (!session) throw notFound()
    return { session, oneThing, presets }
  },
})

function SessionPage() {
  const data = Route.useLoaderData() as {
    session: PracticeSession
    oneThing: string
    presets: MetronomePreset[]
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title={data.session.templateName}
        description={
          <>
            {formatUtcDateTime(data.session.startedAt)} ·{' '}
            <Badge variant="accent">{data.session.theme}</Badge>{' '}
            <Badge>{sessionKindLabel(data.session.kind)}</Badge>
          </>
        }
      />
      <SessionTimer session={data.session} oneThing={data.oneThing} />
      {data.session.status === 'completed' && data.session.kind !== 'rest' ? (
        <div className="mt-4">
          <MoodPicker session={data.session} />
        </div>
      ) : null}
      {data.session.status === 'active' ? (
        <div className="mt-4">
          <Card title="Metronome" description="Keep the click running while you work.">
            <SessionMetronome presets={data.presets} />
          </Card>
        </div>
      ) : null}
    </main>
  )
}

const MOOD_LABELS: Record<Mood, string> = {
  energized: 'Energized',
  neutral: 'Neutral',
  drained: 'Drained',
}

function MoodPicker({ session }: { session: PracticeSession }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pick(mood: Mood) {
    setBusy(true)
    setError(null)
    try {
      await setSessionMood({ data: { id: session.id, mood } })
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your mood.')
      setBusy(false)
    }
  }

  return (
    <Card
      title="How are you feeling?"
      description="One tap — over time this shows when practice energises or drains you."
    >
      {error ? (
        <p role="alert" className="mb-3 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {MOODS.map((mood) => (
          <Button
            key={mood}
            size="lg"
            variant={session.mood === mood ? 'primary' : 'secondary'}
            aria-pressed={session.mood === mood}
            disabled={busy}
            onClick={() => void pick(mood)}
          >
            {MOOD_LABELS[mood]}
          </Button>
        ))}
      </div>
    </Card>
  )
}

function SessionMetronome({ presets }: { presets: MetronomePreset[] }) {
  const router = useRouter()
  return (
    <MetronomePanel
      presets={presets}
      onSavePreset={async (input) => {
        await savePreset({ data: input })
        router.invalidate()
      }}
      onDeletePreset={async (id) => {
        await deletePreset({ data: { id } })
        router.invalidate()
      }}
    />
  )
}
