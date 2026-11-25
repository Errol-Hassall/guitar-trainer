import { createFileRoute, useRouter } from '@tanstack/react-router'
import type { TemplateInput } from '#/lib/types'
import { createTemplate } from '#/server/api'
import { PageHeader } from '#/components/ui/page-header'
import { TemplateForm } from '#/components/template-form'

export const Route = createFileRoute('/templates/new')({
  component: NewTemplatePage,
})

function NewTemplatePage() {
  const router = useRouter()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="New template" description="Plan a routine in named sections." />
      <TemplateForm
        submitLabel="Create template"
        onSubmit={async (input: TemplateInput) => {
          const template = await createTemplate({ data: input })
          router.navigate({ to: '/templates/$templateId', params: { templateId: String(template.id) } })
        }}
      />
    </main>
  )
}
