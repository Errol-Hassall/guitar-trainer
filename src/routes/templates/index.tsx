import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { Pencil, Play, Plus, Trash2 } from 'lucide-react'
import type { Template } from '#/lib/types'
import { themeForWeekday, totalMinutes } from '#/lib/sessions'
import { deleteTemplate, listTemplates, startSession } from '#/server/api'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/templates/')({
  component: TemplatesPage,
  loader: () => listTemplates(),
})

function TemplatesPage() {
  const router = useRouter()
  const templates = Route.useLoaderData() as Template[]
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const builtins = templates.filter((template) => template.isBuiltin)
  const customs = templates.filter((template) => !template.isBuiltin)

  async function handleDelete(template: Template) {
    setConfirmingId(null)
    try {
      await deleteTemplate({ data: { id: template.id } })
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the template.')
    }
  }

  async function handleStart(template: Template) {
    setError(null)
    try {
      const { id } = await startSession({
        data: { templateId: template.id, kind: 'full', theme: themeForWeekday(new Date()) },
      })
      router.navigate({ to: '/sessions/$sessionId', params: { sessionId: String(id) } })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the session.')
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Templates"
        description="Session plans. Built-ins are fixed; make your own for different routines."
        actions={
          <Link to="/templates/new">
            <Button>
              <Plus className="size-4" aria-hidden="true" /> New template
            </Button>
          </Link>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold">Built-in</h2>
      <div className="mb-8 flex flex-col gap-4">
        {builtins.map((template) => (
          <TemplateCard key={template.id} template={template} onStart={() => void handleStart(template)} />
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold">My templates</h2>
      {customs.length === 0 ? (
        <p className="text-sm text-muted">
          No custom templates yet.{' '}
          <Link to="/templates/new" className="text-accent underline">
            Create one
          </Link>{' '}
          — or copy a built-in’s sections into a new template.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {customs.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onStart={() => void handleStart(template)}
              actions={
                <>
                  <Link to="/templates/$templateId" params={{ templateId: String(template.id) }}>
                    <Button variant="secondary" size="sm">
                      <Pencil className="size-4" aria-hidden="true" /> Edit
                    </Button>
                  </Link>
                  {confirmingId === template.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => void handleDelete(template)}>
                        Confirm delete
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmingId(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Delete template ${template.name}`}
                      onClick={() => setConfirmingId(template.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
    </main>
  )
}

function TemplateCard({
  template,
  onStart,
  actions,
}: {
  template: Template
  onStart: () => void
  actions?: React.ReactNode
}) {
  return (
    <Card
      title={template.name}
      description={`${template.sections.length} sections · ${totalMinutes(template.sections)} min`}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onStart}>
            <Play className="size-4" aria-hidden="true" /> Start
          </Button>
          {actions}
          <Badge>{template.isBuiltin ? 'Built-in' : 'Custom'}</Badge>
        </div>
      }
    >
      <ol className="flex flex-wrap gap-2 text-sm">
        {template.sections.map((section) => (
          <li key={section.id} className="rounded-full border border-line bg-raised px-3 py-1">
            {section.name} · {section.minutes} min
          </li>
        ))}
      </ol>
    </Card>
  )
}
