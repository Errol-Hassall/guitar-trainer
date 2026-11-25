import { useEffect, useState } from 'react'
import { setOneThing } from '#/server/api'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Field, controlClass } from './ui/field'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function OneThingCard({ initial }: { initial: string }) {
  const [text, setText] = useState(initial)
  const [status, setStatus] = useState<SaveStatus>('idle')

  // Follow external updates (e.g. a weekly review pinning the focus).
  useEffect(() => {
    setText(initial)
  }, [initial])

  async function handleSave() {
    setStatus('saving')
    try {
      await setOneThing({ data: { text } })
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <Card
      title="One thing to fix this week"
      description="Pinned at the start of every session."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void handleSave()
        }}
      >
        <Field label="Focus note" htmlFor="one-thing">
          <textarea
            id="one-thing"
            rows={2}
            maxLength={500}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="e.g. Keep the low E string clean during strums."
            className={`${controlClass} min-h-16 py-2`}
          />
        </Field>
        <div className="mt-3 flex items-center gap-3" data-save-status={status}>
          <Button type="submit" disabled={status === 'saving'}>
            Save
          </Button>
          {status === 'saved' ? (
            <span className="text-sm text-success">Saved.</span>
          ) : null}
          {status === 'error' ? (
            <span role="alert" className="text-sm text-danger">
              Could not save the note.
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
