import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { NOTE_NAMES } from '#/lib/ear'
import { generateLick, lickToText, type LickStyle } from '#/lib/lick'
import { SCALE_TYPES } from '#/lib/theory'
import { playMidiNotes } from '#/components/ear/synth'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/licklab')({
  component: LickLabPage,
})

function LickLabPage() {
  const [rootPc, setRootPc] = useState(9) // A
  const [scaleId, setScaleId] = useState('minor-pentatonic')
  const [style, setStyle] = useState<LickStyle>('blues')
  const [seed, setSeed] = useState(42)
  const [copied, setCopied] = useState(false)

  // Live generation: every control change produces a new deterministic lick.
  const lick = useMemo(() => generateLick({ rootPc, scaleId, style, seed }), [rootPc, scaleId, style, seed])
  const scaleName = SCALE_TYPES.find((type) => type.id === scaleId)?.name ?? scaleId

  async function copy() {
    try {
      await navigator.clipboard.writeText(lickToText(lick))
      setCopied(true)
    } catch {
      // Clipboard unavailable (permissions / insecure context) — the button
      // simply does not flip to "Copied".
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="LickLab"
        description="Short playable phrases generated from scale data. Everything is local and deterministic — the same seed always gives the same lick."
      />
      <div className="flex flex-col gap-4">
        <Card title="Generate">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Key" htmlFor="lick-root">
              <select
                id="lick-root"
                className={controlClass}
                value={rootPc}
                onChange={(event) => setRootPc(Number(event.target.value))}
              >
                {NOTE_NAMES.map((name, pc) => (
                  <option key={name} value={pc}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Scale" htmlFor="lick-scale">
              <select
                id="lick-scale"
                className={controlClass}
                value={scaleId}
                onChange={(event) => setScaleId(event.target.value)}
              >
                {SCALE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Style" htmlFor="lick-style">
              <select
                id="lick-style"
                className={controlClass}
                value={style}
                onChange={(event) => setStyle(event.target.value as LickStyle)}
              >
                <option value="blues">Blues</option>
                <option value="jazz">Jazz</option>
              </select>
            </Field>
            <Field label="Seed" htmlFor="lick-seed" hint="Same seed → same lick">
              <input
                id="lick-seed"
                type="number"
                inputMode="numeric"
                min={0}
                className={controlClass}
                value={seed}
                onChange={(event) => setSeed(Math.max(0, Math.floor(Number(event.target.value))))}
              />
            </Field>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => setSeed(Math.floor(Math.random() * 100000))}
            data-new-seed="true"
          >
            New seed
          </Button>
        </Card>

        <Card
          title={`Lick — ${NOTE_NAMES[rootPc]} ${scaleName}`}
          actions={
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void playMidiNotes(lick.notes.map((note) => note.midi))}
                data-lick-play="true"
              >
                Play
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void copy()} data-lick-copy="true">
                {copied ? 'Copied' : 'Copy as text'}
              </Button>
            </div>
          }
        >
          <ol className="flex flex-wrap gap-2" data-lick-list="true">
            {lick.notes.map((note, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2"
                data-lick-note={`${i}`}
              >
                <span className="font-mono text-sm font-semibold">{note.name}</span>
                <span className="text-xs text-muted">
                  s{6 - note.stringIndex}·f{note.fret}
                </span>
                {note.technique && <Badge variant="teal">{note.technique}</Badge>}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </main>
  )
}
