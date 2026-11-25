import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { ExerciseSummary } from '#/lib/types'
import { deleteExercise, listExercises } from '#/server/api'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/exercises/')({
  component: ExercisesPage,
  loader: () => listExercises(),
})

function ExercisesPage() {
  const router = useRouter()
  const exercises = Route.useLoaderData() as ExerciseSummary[]
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(exercise: ExerciseSummary) {
    setConfirmingId(null)
    try {
      await deleteExercise({ data: { id: exercise.id } })
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the exercise.')
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Exercises"
        description="Your drills and drills-in-progress. Timed ones track BPM over time."
        actions={
          <Link to="/exercises/new">
            <Button>
              <Plus className="size-4" aria-hidden="true" /> New exercise
            </Button>
          </Link>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {exercises.length === 0 ? (
        <p className="text-sm text-muted">
          No exercises yet.{' '}
          <Link to="/exercises/new" className="text-accent underline">
            Create one
          </Link>{' '}
          — timed drills track your max clean BPM, untimed ones track completion.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {exercises.map((exercise) => (
            <Card
              key={exercise.id}
              title={exercise.name}
              description={summarise(exercise)}
              actions={
                <div className="flex items-center gap-2">
                  <Link to="/exercises/$exerciseId" params={{ exerciseId: String(exercise.id) }}>
                    <Button variant="secondary" size="sm">
                      <Pencil className="size-4" aria-hidden="true" /> Open
                    </Button>
                  </Link>
                  {exercise.isBuiltin ? (
                    <Badge variant="accent">Built-in</Badge>
                  ) : confirmingId === exercise.id ? (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => void handleDelete(exercise)}
                      >
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
                      aria-label={`Delete exercise ${exercise.name}`}
                      onClick={() => setConfirmingId(exercise.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                  <Badge>{exercise.hasTiming ? 'Timed' : 'Untimed'}</Badge>
                </div>
              }
            >
              {exercise.tags.length > 0 ? (
                <ol className="flex flex-wrap gap-2 text-sm">
                  {exercise.tags.map((tag) => (
                    <li key={tag} className="rounded-full border border-line bg-raised px-3 py-1">
                      {tag}
                    </li>
                  ))}
                </ol>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}

function summarise(exercise: ExerciseSummary): string {
  const parts = [`Difficulty ${exercise.difficulty}/5`]
  if (exercise.hasTiming && exercise.latestBpm !== null) {
    parts.push(`Latest ${exercise.latestBpm} BPM`)
  }
  if (!exercise.hasTiming && exercise.latestRating !== null) {
    parts.push(`Rated ${exercise.latestRating}/5`)
  }
  if (exercise.logCount > 0) {
    parts.push(`${exercise.logCount} log${exercise.logCount === 1 ? '' : 's'}`)
  }
  return parts.join(' · ')
}
