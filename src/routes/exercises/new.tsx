import { createFileRoute, useRouter } from '@tanstack/react-router'
import type { ExerciseInput } from '#/lib/types'
import { createExercise } from '#/server/api'
import { PageHeader } from '#/components/ui/page-header'
import { ExerciseForm } from '#/components/exercise-form'

export const Route = createFileRoute('/exercises/new')({
  component: NewExercisePage,
})

function NewExercisePage() {
  const router = useRouter()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="New exercise"
        description="Timed exercises track BPM progress; untimed ones track completion and self-rating."
      />
      <ExerciseForm
        submitLabel="Create exercise"
        onSubmit={async (input: ExerciseInput) => {
          const created = await createExercise({ data: input })
          router.navigate({
            to: '/exercises/$exerciseId',
            params: { exerciseId: String(created.id) },
          })
        }}
      />
    </main>
  )
}
