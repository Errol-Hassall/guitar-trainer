import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import type { MetronomePreset, PracticeSession } from '#/lib/types'
import { formatUtcDateTime, sessionKindLabel } from '#/lib/sessions'
import { deletePreset, getSession, getOneThing, listPresets, savePreset } from '#/server/api'
import { MetronomePanel } from '#/components/metronome-panel'
import { Badge } from '#/components/ui/badge'
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
