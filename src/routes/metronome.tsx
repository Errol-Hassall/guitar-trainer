import { createFileRoute, useRouter } from '@tanstack/react-router'
import type { MetronomePreset, PresetInput } from '#/lib/types'
import { deletePreset, listPresets, savePreset } from '#/server/api'
import { MetronomePanel } from '#/components/metronome-panel'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/metronome')({
  component: MetronomePage,
  loader: () => listPresets(),
})

function MetronomePage() {
  const router = useRouter()
  const presets = Route.useLoaderData() as MetronomePreset[]

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Metronome"
        description="A standalone click: accents, subdivisions, count-in and tap tempo."
      />
      <MetronomePanel
        presets={presets}
        onSavePreset={async (input: PresetInput) => {
          await savePreset({ data: input })
          router.invalidate()
        }}
        onDeletePreset={async (id: number) => {
          await deletePreset({ data: { id } })
          router.invalidate()
        }}
      />
    </main>
  )
}
