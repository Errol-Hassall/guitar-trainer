import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { NOTE_NAMES } from '#/lib/ear'
import { CHORD_DIAGRAMS, chordDiagram, chordPcs, neckNotesFor } from '#/lib/theory'
import { ChordDiagramChart } from '#/components/chord-diagram'
import { Fretboard } from '#/components/fretboard'
import { PracticeWindowCard } from '#/components/practice-window'
import { useNeckPlayback } from '#/hooks/use-neck-playback'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/arpeggios')({
  component: ArpeggiosPage,
})

const MAX_FRET = 12

function ArpeggiosPage() {
  const [chordName, setChordName] = useState('C')
  const diagram = chordDiagram(chordName)!
  const pcs = chordPcs(diagram)
  const neck = neckNotesFor(pcs, MAX_FRET)
  const playback = useNeckPlayback(neck)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Arpeggios"
        description="The chord tones of any common chord, mapped to the neck. Pick a fret window and play them up and down."
      />
      <div data-chord-name={chordName} className="flex flex-col gap-4">
        <Card title="Chord" description={`${diagram.name} — ${pcs.map((pc) => NOTE_NAMES[pc]).join(' ')}`}>
          <div className="flex flex-wrap items-start gap-6">
            <Field label="Chord" htmlFor="arpeggio-chord">
              <select
                id="arpeggio-chord"
                className={controlClass}
                value={chordName}
                onChange={(event) => setChordName(event.target.value)}
              >
                {CHORD_DIAGRAMS.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <ChordDiagramChart diagram={diagram} />
          </div>
        </Card>
        <Card title="On the neck" description={`Frets 1–${MAX_FRET}, open strings marked at the nut.`}>
          <Fretboard
            neck={neck}
            lo={playback.lo}
            hi={playback.hi}
            playingIndex={playback.playingIndex}
            sequence={playback.sequence}
            label={`${chordName} chord tones on the fretboard`}
          />
        </Card>
        <PracticeWindowCard playback={playback} />
      </div>
    </main>
  )
}
