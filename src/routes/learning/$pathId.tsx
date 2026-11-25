import { useState } from 'react'
import { Link, createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { CheckCircle2, CircleDashed, Lock } from 'lucide-react'
import type { LearningPathDetail, LearningPathStep } from '#/lib/types'
import { getLearningPath, toggleStepCompletion } from '#/server/api'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/learning/$pathId')({
  component: PathPage,
  loader: async ({ params }) => {
    const path = await getLearningPath({ data: { id: Number(params.pathId) } })
    if (!path) throw notFound()
    return path
  },
})

function PathPage() {
  const router = useRouter()
  const path = Route.useLoaderData() as LearningPathDetail
  const [error, setError] = useState<string | null>(null)

  async function handleToggle(step: LearningPathStep) {
    setError(null)
    try {
      await toggleStepCompletion({ data: { stepId: step.id, completed: !step.completed } })
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the step.')
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={path.name}
        description={
          <>
            {path.description}{' '}
            <Badge variant="teal">{path.theme}</Badge>
          </>
        }
        actions={
          <Link to="/learning">
            <Button variant="ghost" size="sm">
              All paths
            </Button>
          </Link>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <ol className="flex flex-col gap-4">
        {path.steps.map((step) => (
          <li key={step.id}>
            <Card
              title={
                <span className="flex items-center gap-2">
                  {step.completed ? (
                    <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  ) : step.unlocked ? (
                    <CircleDashed className="size-5 text-accent" aria-hidden="true" />
                  ) : (
                    <Lock className="size-5 text-muted" aria-hidden="true" />
                  )}
                  Step {step.position}: {step.title}
                </span>
              }
              actions={
                step.unlocked ? (
                  <Button
                    size="sm"
                    variant={step.completed ? 'ghost' : 'primary'}
                    aria-label={`${step.completed ? 'Mark incomplete' : 'Mark complete'}: ${step.title}`}
                    onClick={() => void handleToggle(step)}
                  >
                    {step.completed ? 'Mark incomplete' : 'Mark complete'}
                  </Button>
                ) : (
                  <Badge>Locked</Badge>
                )
              }
            >
              <p className="text-sm text-muted">{step.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {step.requiresTitle ? (
                  <Badge variant={step.completed ? 'success' : 'default'}>
                    Requires: {step.requiresTitle}
                  </Badge>
                ) : null}
                {step.exerciseId !== null && step.exerciseName ? (
                  <Link
                    to="/exercises/$exerciseId"
                    params={{ exerciseId: String(step.exerciseId) }}
                    className="text-accent underline"
                  >
                    Drill: {step.exerciseName}
                  </Link>
                ) : null}
                {step.externalUrl ? (
                  <a
                    href={step.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline"
                  >
                    External resource
                  </a>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </main>
  )
}
