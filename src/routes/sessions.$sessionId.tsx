import { useState, type ReactNode } from 'react'
import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import type { MetronomePreset, Mood, PracticeSession } from '#/lib/types'
import { MOODS } from '#/lib/types'
import { useHandsFree } from '#/hooks/use-hands-free'
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
  const handsFree = useHandsFree(data.session.status === 'active')

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
        <div className="mt-4 flex flex-col gap-4">
          <Card title="Hands-free control" description="Foot-pedal keys and voice commands for this session.">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                Foot pedal (any keyboard-emulating USB/Bluetooth pedal): <Kbd>Space</Kbd>{' '}
                start/pause · <Kbd>N</Kbd> next section · <Kbd>T</Kbd> tap tempo
              </p>
              <div
                className="flex flex-wrap items-center gap-3"
                data-voice-state={handsFree.voiceEnabled ? 'on' : 'off'}
              >
                <Button
                  variant={handsFree.voiceEnabled ? 'danger' : 'secondary'}
                  onClick={handsFree.toggleVoice}
                  disabled={!handsFree.voiceSupported}
                >
                  {handsFree.voiceEnabled ? 'Stop voice control' : 'Enable voice control'}
                </Button>
                {handsFree.lastCommand !== '' ? (
                  <Badge variant="teal">Heard “{handsFree.lastCommand}”</Badge>
                ) : null}
              </div>
              {!handsFree.voiceSupported ? (
                <p className="text-sm text-muted">
                  Voice control needs a Chromium-based browser (Chrome or Edge).
                </p>
              ) : null}
              {handsFree.voiceError !== '' ? (
                <p role="alert" className="text-sm text-danger">
                  {handsFree.voiceError}
                </p>
              ) : null}
            </div>
          </Card>
          <Card title="Metronome" description="Keep the click running while you work.">
            <SessionMetronome presets={data.presets} />
          </Card>
        </div>
      ) : null}
    </main>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-xs">
      {children}
    </kbd>
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
