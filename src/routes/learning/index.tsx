import { Link, createFileRoute } from '@tanstack/react-router'
import type { LearningPathSummary } from '#/lib/types'
import { listLearningPaths } from '#/server/api'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/learning/')({
  component: LearningPage,
  loader: () => listLearningPaths(),
})

function LearningPage() {
  const paths = Route.useLoaderData() as LearningPathSummary[]

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Learning"
        description="Curated paths that mirror the weekly rotation. Complete a step to unlock the next one."
      />
      {paths.length === 0 ? (
        <p className="text-sm text-muted">No learning paths yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {paths.map((path) => (
            <Card
              key={path.id}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {path.name}
                  <Badge variant="teal">{path.theme}</Badge>
                </span>
              }
              description={path.description}
              actions={
                <Link to="/learning/$pathId" params={{ pathId: String(path.id) }}>
                  <Button variant="secondary" size="sm">
                    Open
                  </Button>
                </Link>
              }
            >
              <Badge
                variant={
                  path.completedSteps === path.stepCount ? 'success' : 'default'
                }
              >
                {path.completedSteps}/{path.stepCount} steps done
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
