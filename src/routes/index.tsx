import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { CalendarClock, Flame, MoonStar, Play } from 'lucide-react'
import type { SessionSummary, Template, Theme } from '#/lib/types'
import { THEMES } from '#/lib/types'
import {
  formatDuration,
  formatUtcDateTime,
  sessionKindLabel,
  themeForWeekday,
} from '#/lib/sessions'
import {
  completeSession,
  getActiveSession,
  getOneThing,
  listSessions,
  listTemplates,
  startRestDay,
  startSession,
} from '#/server/api'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'
import { OneThingCard } from '#/components/one-thing-card'

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const [templates, active, recent, oneThing] = await Promise.all([
      listTemplates(),
      getActiveSession(),
      listSessions({ data: { limit: 5 } }),
      getOneThing(),
    ])
    return {
      templates,
      active,
      recent,
      oneThing,
      todayTheme: themeForWeekday(new Date()),
    }
  },
})

function Home() {
  const router = useRouter()
  const data = Route.useLoaderData()
  const [theme, setTheme] = useState<Theme>(data.todayTheme)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = data.active
  const daily = data.templates.find((template) => template.slug === 'daily-60')
  const emergency = data.templates.find((template) => template.slug === 'emergency-20')

  async function startWith(template: Template, kind: 'full' | 'light') {
    setBusy(true)
    setError(null)
    try {
      const { id } = await startSession({ data: { templateId: template.id, kind, theme } })
      router.navigate({ to: '/sessions/$sessionId', params: { sessionId: String(id) } })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the session.')
    } finally {
      setBusy(false)
    }
  }

  async function logRestDay() {
    setBusy(true)
    setError(null)
    try {
      const { id } = await startRestDay({ data: { theme } })
      router.navigate({ to: '/sessions/$sessionId', params: { sessionId: String(id) } })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not log the rest day.')
    } finally {
      setBusy(false)
    }
  }

  async function endActiveSession() {
    if (!active) return
    setBusy(true)
    try {
      await completeSession({ data: { id: active.id } })
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not end the session.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Practice"
        description={
          <>
            Today’s theme: <Badge variant="accent">{data.todayTheme}</Badge>
          </>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {active ? (
        <Card title="Session in progress" description={active.templateName}>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="teal">{sessionKindLabel(active.kind)}</Badge>
            <span className="text-sm text-muted">
              Started {formatUtcDateTime(active.startedAt)}
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                onClick={() =>
                  router.navigate({
                    to: '/sessions/$sessionId',
                    params: { sessionId: String(active.id) },
                  })
                }
              >
                <Play className="size-4" aria-hidden="true" /> Resume
              </Button>
              <Button variant="danger" onClick={() => void endActiveSession()} disabled={busy}>
                End session
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Start a session">
          <div className="flex flex-col gap-4">
            <Field label="Session theme" htmlFor="session-theme" hint="Follows the weekly rotation; pick another if today is different.">
              <select
                id="session-theme"
                value={theme}
                onChange={(event) => setTheme(event.target.value as Theme)}
                className={`${controlClass} max-w-72`}
              >
                {THEMES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex flex-wrap gap-3">
              {daily ? (
                <>
                  <Button size="lg" onClick={() => void startWith(daily, 'full')} disabled={busy}>
                    <Play className="size-5" aria-hidden="true" /> Start full session · 60 min
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => void startWith(daily, 'light')} disabled={busy}>
                    Light session · ~30 min
                  </Button>
                </>
              ) : null}
              {emergency ? (
                <Button variant="secondary" size="lg" onClick={() => void startWith(emergency, 'full')} disabled={busy}>
                  <Flame className="size-5" aria-hidden="true" /> Emergency 20 quick start
                </Button>
              ) : null}
              <Button variant="ghost" size="lg" onClick={() => void logRestDay()} disabled={busy}>
                <MoonStar className="size-5" aria-hidden="true" /> Log a rest day
              </Button>
            </div>

            <p className="text-sm text-muted">
              Need a different routine?{' '}
              <Link to="/templates" className="text-accent underline">
                Create a template
              </Link>{' '}
              and start it from there.
            </p>
          </div>
        </Card>
      )}

      <OneThingCard initial={data.oneThing} />

      <Card
        title="Recent sessions"
        description={
          data.recent.length > 5 ? (
            <>
              Showing the latest 5.{' '}
              <Link to="/history" className="text-accent underline">
                View all
              </Link>
            </>
          ) : undefined
        }
      >
        {data.recent.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <CalendarClock className="size-4" aria-hidden="true" /> No sessions yet — start your first one above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.recent.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </ul>
        )}
      </Card>
    </main>
  )
}

export function SessionRow({ session }: { session: SessionSummary }) {
  return (
    <li>
      <Link
        to="/sessions/$sessionId"
        params={{ sessionId: String(session.id) }}
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-raised px-3 py-2 transition-colors hover:border-accent/50"
      >
        <span className="min-w-0">
          <span className="font-medium">{session.templateName}</span>
          <span className="ml-2 text-xs text-muted">
            {formatUtcDateTime(session.startedAt)} · {session.theme}
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs">
          <Badge variant={session.kind === 'rest' ? 'teal' : 'default'}>
            {sessionKindLabel(session.kind)}
          </Badge>
          {session.status === 'active' ? (
            <Badge variant="accent">active</Badge>
          ) : null}
          <span className="text-muted">{formatDuration(session.totalSeconds)}</span>
        </span>
      </Link>
    </li>
  )
}
