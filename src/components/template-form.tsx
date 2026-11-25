import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { TemplateInput } from '#/lib/types'
import { totalMinutes } from '#/lib/sessions'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Field, controlClass } from './ui/field'

interface SectionDraft {
  name: string
  minutes: number
}

export function TemplateForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: { name: string; sections: SectionDraft[] }
  submitLabel: string
  onSubmit: (input: TemplateInput) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [sections, setSections] = useState<SectionDraft[]>(
    initial?.sections ?? [{ name: '', minutes: 10 }],
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function updateSection(index: number, patch: Partial<SectionDraft>) {
    setSections((previous) =>
      previous.map((section, i) => (i === index ? { ...section, ...patch } : section)),
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (name.trim() === '') {
      setError('Give the template a name.')
      return
    }
    for (const [index, section] of sections.entries()) {
      if (section.name.trim() === '') {
        setError(`Section ${index + 1} needs a name.`)
        return
      }
      if (!Number.isInteger(section.minutes) || section.minutes < 1 || section.minutes > 180) {
        setError(`Section ${index + 1} must be between 1 and 180 minutes.`)
        return
      }
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        sections: sections.map((section) => ({
          name: section.name.trim(),
          minutes: section.minutes,
        })),
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the template.')
      setBusy(false)
    }
  }

  const total = totalMinutes(
    sections.map((section) => ({ minutes: section.minutes, name: '', id: 0, position: 0 })),
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Card title={initial ? 'Edit template' : 'New template'}>
        <div className="flex flex-col gap-4">
          <Field label="Template name" htmlFor="template-name">
            <input
              id="template-name"
              type="text"
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Morning focus"
              className={controlClass}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">
              Sections (in order) — {total} min total
            </span>
            {sections.map((section, index) => (
              <div key={index} className="flex items-end gap-2">
                <Field label={`Section ${index + 1}`} htmlFor={`section-name-${index}`}>
                  <input
                    id={`section-name-${index}`}
                    type="text"
                    maxLength={40}
                    value={section.name}
                    onChange={(event) => updateSection(index, { name: event.target.value })}
                    placeholder="e.g. Technique"
                    className={controlClass}
                  />
                </Field>
                <div className="w-28 shrink-0">
                  <Field label="Minutes" htmlFor={`section-minutes-${index}`}>
                    <input
                      id={`section-minutes-${index}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={180}
                      value={Number.isFinite(section.minutes) ? section.minutes : ''}
                      onChange={(event) =>
                        updateSection(index, { minutes: Number(event.target.value) })
                      }
                      className={controlClass}
                    />
                  </Field>
                </div>
                <Button
                  variant="danger"
                  aria-label={`Remove section ${index + 1}`}
                  disabled={sections.length <= 1}
                  onClick={() =>
                    setSections((previous) => previous.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {submitLabel}
            </Button>
            <Button
              variant="secondary"
              disabled={sections.length >= 12}
              onClick={() => setSections((previous) => [...previous, { name: '', minutes: 5 }])}
            >
              <Plus className="size-4" aria-hidden="true" /> Add section
            </Button>
          </div>
        </div>
      </Card>
    </form>
  )
}
