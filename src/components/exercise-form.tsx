import { useState } from 'react'
import type { Exercise, ExerciseInput } from '#/lib/types'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Field, controlClass } from './ui/field'

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy',
  2: 'Comfortable',
  3: 'Moderate',
  4: 'Hard',
  5: 'Very hard',
}

export function ExerciseForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Pick<Exercise, 'name' | 'hasTiming' | 'difficulty' | 'tags' | 'tabText'>
  submitLabel: string
  onSubmit: (input: ExerciseInput) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [hasTiming, setHasTiming] = useState(initial?.hasTiming ?? true)
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 3)
  const [tags, setTags] = useState(initial ? initial.tags.join(', ') : '')
  const [tabText, setTabText] = useState(initial?.tabText ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (name.trim() === '') {
      setError('Give the exercise a name.')
      return
    }
    const parsedTags = tags.split(',').map((tag) => tag.trim()).filter((tag) => tag !== '')
    if (parsedTags.length > 8) {
      setError('Use at most 8 tags.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        hasTiming,
        difficulty,
        tags: parsedTags,
        tabText,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the exercise.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Card title={initial ? 'Edit exercise' : 'New exercise'}>
        <div className="flex flex-col gap-4">
          <Field label="Exercise name" htmlFor="exercise-name">
            <input
              id="exercise-name"
              type="text"
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Alternate picking, 16ths"
              className={controlClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Type"
              htmlFor="exercise-type"
              hint={hasTiming ? 'Tracks BPM progress over time' : 'Tracks completion and self-rating'}
            >
              <select
                id="exercise-type"
                value={hasTiming ? 'timed' : 'untimed'}
                onChange={(event) => setHasTiming(event.target.value === 'timed')}
                className={controlClass}
              >
                <option value="timed">Timed (BPM)</option>
                <option value="untimed">Untimed</option>
              </select>
            </Field>
            <Field label="Difficulty" htmlFor="exercise-difficulty">
              <select
                id="exercise-difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(Number(event.target.value))}
                className={controlClass}
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    {level} – {DIFFICULTY_LABELS[level]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Tags" htmlFor="exercise-tags" hint="Comma separated, e.g. Technique, Key of E">
            <input
              id="exercise-tags"
              type="text"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Technique, Alternate picking"
              className={controlClass}
            />
          </Field>

          <Field label="Tabs / notation" htmlFor="exercise-tabs" hint="Optional ASCII tab or notes">
            <textarea
              id="exercise-tabs"
              rows={4}
              maxLength={4000}
              value={tabText}
              onChange={(event) => setTabText(event.target.value)}
              placeholder={'e|---0-2-4-\nb|---1-3-5-'}
              className={`${controlClass} font-mono`}
            />
          </Field>

          <Button type="submit" disabled={busy}>
            {submitLabel}
          </Button>
        </div>
      </Card>
    </form>
  )
}
