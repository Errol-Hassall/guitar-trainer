import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { NOTE_NAMES } from '#/lib/ear'
import { SCALE_TYPES, neckNotes, scaleNoteNames, scaleTypeById } from '#/lib/theory'
import { Fretboard } from '#/components/fretboard'
import { PracticeWindowCard } from '#/components/practice-window'
import { useNeckPlayback } from '#/hooks/use-neck-playback'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/scales')({
  component: ScalesPage,
})

const MAX_FRET = 12

function ScalesPage() {
  const [typeId, setTypeId] = useState('major')
  const [rootPc, setRootPc] = useState(0)
  const type = scaleTypeById(typeId)!

  const neck = useMemo(() => neckNotes(rootPc, type, MAX_FRET), [rootPc, type])
  // One spelling per pitch class, so dots and chips agree (C blues shows Gb, not F#).
  const pcToName = useMemo(() => {
    const names = scaleNoteNames(rootPc, type)
    return new Map(type.intervals.map((offset, index) => [(rootPc + offset) % 12, names[index]]))
  }, [rootPc, type])

  const playback = useNeckPlayback(neck)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Scale library"
        description="Six scale types in every key, mapped to the neck. Pick a fret window and play it back."
      />
      <div data-scale-type={type.id} data-root-pc={rootPc} className="flex flex-col gap-4">
        <Card title="Scale" description={`${NOTE_NAMES[rootPc]} ${type.name}`}>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Key" htmlFor="scale-root">
              <select
                id="scale-root"
                className={controlClass}
                value={rootPc}
                onChange={(event) => setRootPc(Number(event.target.value))}
              >
                {NOTE_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Scale type" htmlFor="scale-type">
              <select
                id="scale-type"
                className={controlClass}
                value={typeId}
                onChange={(event) => setTypeId(event.target.value)}
              >
                {SCALE_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Scale notes">
            {scaleNoteNames(rootPc, type).map((name) => (
              <li key={name} className="rounded-md border border-line bg-raised px-2 py-0.5 font-mono text-sm">
                {name}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="On the neck" description={`Frets 1–${MAX_FRET}, open strings marked at the nut.`}>
          <Fretboard
            neck={neck}
            pcToName={pcToName}
            lo={playback.lo}
            hi={playback.hi}
            playingIndex={playback.playingIndex}
            sequence={playback.sequence}
            label="Scale notes on the fretboard"
          />
        </Card>
        <PracticeWindowCard playback={playback} />
      </div>
    </main>
  )
}
