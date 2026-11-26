import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { NOTE_NAMES } from '#/lib/ear'
import { MODES, modeById, modeNoteNames, neckNotesFor, parentMajorRoot, scalePcs } from '#/lib/theory'
import { Fretboard } from '#/components/fretboard'
import { PracticeWindowCard } from '#/components/practice-window'
import { useNeckPlayback } from '#/hooks/use-neck-playback'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/modes')({
  component: ModesPage,
})

const MAX_FRET = 12

function ModesPage() {
  const [modeId, setModeId] = useState('ionian')
  const [rootPc, setRootPc] = useState(0)
  const mode = modeById(modeId)!

  const neck = useMemo(() => neckNotesFor(scalePcs(rootPc, mode), MAX_FRET), [rootPc, mode])
  // One spelling per pitch class, so dots and chips agree.
  const pcToName = useMemo(() => {
    const names = modeNoteNames(rootPc, mode)
    return new Map(mode.intervals.map((offset, index) => [(rootPc + offset) % 12, names[index]]))
  }, [rootPc, mode])

  const playback = useNeckPlayback(neck)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Modes"
        description="The seven diatonic modes with their colour and where they live. Pick a fret window and play it back."
      />
      <div data-mode-id={mode.id} data-root-pc={rootPc} className="flex flex-col gap-4">
        <Card title="Mode" description={`${NOTE_NAMES[rootPc]} ${mode.name}`}>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Mode" htmlFor="mode-select">
              <select
                id="mode-select"
                className={controlClass}
                value={modeId}
                onChange={(event) => setModeId(event.target.value)}
              >
                {MODES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Key" htmlFor="mode-root">
              <select
                id="mode-root"
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
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Mode notes">
            {modeNoteNames(rootPc, mode).map((name) => (
              <li key={name} className="rounded-md border border-line bg-raised px-2 py-0.5 font-mono text-sm">
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted" data-mode-parent={NOTE_NAMES[parentMajorRoot(rootPc, mode)]}>
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: mode.color }} />
            {mode.character} · common in {mode.genres} · same notes as {NOTE_NAMES[parentMajorRoot(rootPc, mode)]} major
          </p>
        </Card>
        <Card title="On the neck" description={`Frets 1–${MAX_FRET}, open strings marked at the nut.`}>
          <Fretboard
            neck={neck}
            pcToName={pcToName}
            lo={playback.lo}
            hi={playback.hi}
            playingIndex={playback.playingIndex}
            sequence={playback.sequence}
            label={`${NOTE_NAMES[rootPc]} ${mode.name} on the fretboard`}
          />
        </Card>
        <PracticeWindowCard playback={playback} />
      </div>
    </main>
  )
}
