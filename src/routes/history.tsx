import { createFileRoute } from '@tanstack/react-router'
import type { SessionSummary } from '#/lib/types'
import { listSessions } from '#/server/api'
import { PageHeader } from '#/components/ui/page-header'
import { Card } from '#/components/ui/card'
import { SessionRow } from './index'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
  loader: () => listSessions({ data: { limit: 100 } }),
})

function HistoryPage() {
  const sessions = Route.useLoaderData() as SessionSummary[]

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="History"
        description={sessions.length > 0 ? `Last ${sessions.length} sessions.` : undefined}
      />
      <Card>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">No sessions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </ul>
        )}
      </Card>
    </main>
  )
}
