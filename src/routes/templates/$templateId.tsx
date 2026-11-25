import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import type { Template, TemplateInput, UpdateTemplateInput } from '#/lib/types'
import { getTemplate, updateTemplate } from '#/server/api'
import { PageHeader } from '#/components/ui/page-header'
import { TemplateForm } from '#/components/template-form'

export const Route = createFileRoute('/templates/$templateId')({
  component: EditTemplatePage,
  loader: async ({ params }) => {
    const template = await getTemplate({ data: { id: Number(params.templateId) } })
    if (!template || template.isBuiltin) throw notFound()
    return template
  },
})

function EditTemplatePage() {
  const router = useRouter()
  const template = Route.useLoaderData() as Template

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={`Edit ${template.name}`} description="Changes apply to new sessions; started sessions keep their plan." />
      <TemplateForm
        initial={{
          name: template.name,
          sections: template.sections.map((section) => ({
            name: section.name,
            minutes: section.minutes,
          })),
        }}
        submitLabel="Save changes"
        onSubmit={async (input: TemplateInput) => {
          const payload: UpdateTemplateInput = { ...input, id: template.id }
          await updateTemplate({ data: payload })
          router.invalidate()
          router.navigate({ to: '/templates' })
        }}
      />
    </main>
  )
}
