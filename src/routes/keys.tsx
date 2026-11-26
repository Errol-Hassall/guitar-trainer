import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { NOTE_NAMES } from '#/lib/ear'
import {
  diatonicChords,
  keySignature,
  minorDiatonicChords,
  minorKeySignature,
  relativeMinor,
} from '#/lib/theory'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/keys')({
  component: KeysPage,
})

type Mode = 'major' | 'minor'

function signatureText(signature: { sharps: string[]; flats: string[] }): string {
  if (signature.sharps.length > 0) {
    return `${signature.sharps.length} sharp${signature.sharps.length === 1 ? '' : 's'} (${signature.sharps.join(' ')})`
  }
  if (signature.flats.length > 0) {
    return `${signature.flats.length} flat${signature.flats.length === 1 ? '' : 's'} (${signature.flats.join(' ')})`
  }
  return 'no sharps or flats'
}

function KeysPage() {
  const [rootPc, setRootPc] = useState(0)
  const [mode, setMode] = useState<Mode>('major')

  const rootName = NOTE_NAMES[rootPc]
  const signature = mode === 'major' ? keySignature(rootPc) : minorKeySignature(rootPc)
  const chords = mode === 'major' ? diatonicChords(rootPc, 'triad') : minorDiatonicChords(rootPc)
  const relativeName =
    mode === 'major' ? `${NOTE_NAMES[relativeMinor(rootPc)]} minor` : `${NOTE_NAMES[(rootPc + 3) % 12]} major`

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Keys"
        description="Key signatures and the diatonic chords of every major and minor key."
      />
      <div data-key-root={rootPc} data-key-mode={mode} className="flex flex-col gap-4">
        <Card title="Key signature" description={`${rootName} ${mode}`}>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Key" htmlFor="key-root">
              <select
                id="key-root"
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
            <div className="flex gap-1" role="group" aria-label="Mode">
              <Button variant={mode === 'major' ? 'primary' : 'secondary'} size="sm" onClick={() => setMode('major')}>
                Major
              </Button>
              <Button variant={mode === 'minor' ? 'primary' : 'secondary'} size="sm" onClick={() => setMode('minor')}>
                Minor
              </Button>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            {rootName} {mode}: {signatureText(signature)}. Relative {mode === 'major' ? 'minor' : 'major'}: {relativeName}.
          </p>
        </Card>
        <Card title={`Chords in ${rootName} ${mode}`}>
          <ul className="flex flex-col gap-2">
            {chords.map((chord) => (
              <li
                key={chord.roman}
                data-roman={chord.roman}
                className="flex min-h-11 items-center justify-between rounded-lg border border-line bg-raised px-3 text-sm"
              >
                <span>
                  <span className="font-mono font-semibold">{chord.roman}</span>{' '}
                  <span className="font-medium">{chord.name}</span>
                </span>
                <span className="text-muted">{chord.quality}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  )
}
