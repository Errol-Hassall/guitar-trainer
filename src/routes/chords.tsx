import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { NOTE_NAMES } from '#/lib/ear'
import {
  CHORD_DIAGRAMS,
  chordToText,
  diatonicChords,
  keySignature,
  relativeMinor,
} from '#/lib/theory'
import { ChordDiagramChart } from '#/components/chord-diagram'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/chords')({
  component: ChordsPage,
})

function ChordsPage() {
  const [query, setQuery] = useState('')
  const [copiedName, setCopiedName] = useState('')

  const filtered = CHORD_DIAGRAMS.filter((diagram) =>
    diagram.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  async function copyChord(name: string) {
    try {
      await navigator.clipboard.writeText(chordToText(CHORD_DIAGRAMS.find((d) => d.name === name)!))
      setCopiedName(name)
    } catch {
      // Clipboard unavailable (permissions / insecure context) — the button
      // simply does not flip to "Copied".
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Chord library"
        description="Standard fingerings for the common chords, plus the diatonic chords of any key."
      />
      <div className="flex flex-col gap-4">
        <Card title="Chords">
          <Field label="Search chords" htmlFor="chord-search">
            <input
              id="chord-search"
              type="search"
              className={controlClass}
              placeholder="C, Am, G7…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Field>
          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-muted" data-chord-empty="true">
              No chords match “{query.trim()}”.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" data-chord-count={filtered.length}>
              {filtered.map((diagram) => (
                <li key={diagram.name} className="rounded-lg border border-line bg-raised p-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="font-semibold">{diagram.name}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void copyChord(diagram.name)}
                      data-copied={copiedName === diagram.name ? 'true' : 'false'}
                    >
                      {copiedName === diagram.name ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <ChordDiagramChart diagram={diagram} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <KeyChordsCard onShow={(name) => setQuery(name)} />
      </div>
    </main>
  )
}

function KeyChordsCard({ onShow }: { onShow: (name: string) => void }) {
  const [rootPc, setRootPc] = useState(0)
  const [kind, setKind] = useState<'triad' | 'seventh'>('triad')

  const rootName = NOTE_NAMES[rootPc]
  const signature = keySignature(rootPc)
  const accidentals =
    signature.sharps.length > 0
      ? `${signature.sharps.length} sharp${signature.sharps.length === 1 ? '' : 's'} (${signature.sharps.join(' ')})`
      : signature.flats.length > 0
        ? `${signature.flats.length} flat${signature.flats.length === 1 ? '' : 's'} (${signature.flats.join(' ')})`
        : 'no sharps or flats'

  return (
    <Card
      title="Chords in a key"
      description={`The seven diatonic chords of ${rootName} major — relative minor ${NOTE_NAMES[relativeMinor(rootPc)]}.`}
    >
      <div data-key-root={rootPc} className="flex flex-wrap items-end gap-3">
        <Field label="Key" htmlFor="key-root">
          <select
            id="key-root"
            className={controlClass}
            value={rootPc}
            onChange={(event) => setRootPc(Number(event.target.value))}
          >
            {NOTE_NAMES.map((name, index) => (
              <option key={name} value={index}>
                {name} major
              </option>
            ))}
          </select>
        </Field>
        <div className="flex gap-1" role="group" aria-label="Chord kind">
          <Button variant={kind === 'triad' ? 'primary' : 'secondary'} size="sm" onClick={() => setKind('triad')}>
            Triads
          </Button>
          <Button
            variant={kind === 'seventh' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setKind('seventh')}
          >
            Sevenths
          </Button>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">{rootName} major — {accidentals}.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {diatonicChords(rootPc, kind).map((chord) => (
          <li key={chord.roman}>
            <button
              type="button"
              onClick={() => onShow(chord.name)}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-line bg-raised px-3 text-left text-sm hover:border-accent"
            >
              <span>
                <span className="font-mono font-semibold">{chord.roman}</span>{' '}
                <span className="font-medium">{chord.name}</span>
              </span>
              <span className="text-muted">{chord.quality}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
