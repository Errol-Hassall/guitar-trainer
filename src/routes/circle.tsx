import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { NOTE_NAMES } from '#/lib/ear'
import { circleOfFifths, diatonicChords, keySignature, relativeMinor } from '#/lib/theory'
import { Card } from '#/components/ui/card'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/circle')({
  component: CirclePage,
})

// Annulus geometry for the SVG ring.
const CENTER = 170
const OUTER = 160
const INNER = 80
const MAJOR_R = 134
const MINOR_R = 98

function polar(radius: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)]
}

/** Annular sector from startAngle to endAngle (degrees, clockwise). */
function wedge(start: number, end: number): string {
  const [ox0, oy0] = polar(OUTER, start)
  const [ox1, oy1] = polar(OUTER, end)
  const [ix1, iy1] = polar(INNER, end)
  const [ix0, iy0] = polar(INNER, start)
  return `M ${ox0} ${oy0} A ${OUTER} ${OUTER} 0 0 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${INNER} ${INNER} 0 0 0 ${ix0} ${iy0} Z`
}

function signatureText(signature: { sharps: string[]; flats: string[] }): string {
  if (signature.sharps.length > 0) {
    return `${signature.sharps.length} sharp${signature.sharps.length === 1 ? '' : 's'} (${signature.sharps.join(' ')})`
  }
  if (signature.flats.length > 0) {
    return `${signature.flats.length} flat${signature.flats.length === 1 ? '' : 's'} (${signature.flats.join(' ')})`
  }
  return 'no sharps or flats'
}

function CirclePage() {
  const [selectedPc, setSelectedPc] = useState(0)
  const ring = circleOfFifths()

  const signature = keySignature(selectedPc)
  const triads = diatonicChords(selectedPc, 'triad')
  const relativeName = NOTE_NAMES[relativeMinor(selectedPc)]

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Circle of fifths"
        description="The twelve keys arranged by ascending fifths. Tap a segment to see its signature and chords."
      />
      <div data-circle-selected={selectedPc} className="flex flex-col gap-4">
        <Card title="The circle" description="Major key on the outer ring, relative minor on the inner ring.">
          <svg
            viewBox="0 0 340 340"
            className="mx-auto w-full max-w-md"
            role="group"
            aria-label="Circle of fifths"
          >
            {ring.map((entry, index) => {
              const mid = -90 + index * 30
              const [mx, my] = polar(MAJOR_R, mid)
              const [nx, ny] = polar(MINOR_R, mid)
              const selected = entry.majorPc === selectedPc
              return (
                <g
                  key={entry.majorPc}
                  role="button"
                  tabIndex={0}
                  data-key-pc={entry.majorPc}
                  aria-label={`${NOTE_NAMES[entry.majorPc]} major, relative ${NOTE_NAMES[entry.minorPc]} minor`}
                  aria-pressed={selected}
                  className="cursor-pointer outline-none focus-visible:opacity-80"
                  onClick={() => setSelectedPc(entry.majorPc)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedPc(entry.majorPc)
                    }
                  }}
                >
                  <path
                    d={wedge(mid - 15, mid + 15)}
                    className={selected ? 'fill-accent stroke-line' : 'fill-raised hover:fill-line stroke-line'}
                  />
                  <text x={mx} y={my} textAnchor="middle" dominantBaseline="central" className={selected ? 'fill-accent-ink text-[14px] font-semibold' : 'fill-ink text-[13px]'}>
                    {NOTE_NAMES[entry.majorPc]}
                  </text>
                  <text x={nx} y={ny} textAnchor="middle" dominantBaseline="central" className={selected ? 'fill-accent-ink text-[10px]' : 'fill-muted text-[10px]'}>
                    {NOTE_NAMES[entry.minorPc]}m
                  </text>
                </g>
              )
            })}
          </svg>
        </Card>
        <Card title={`${NOTE_NAMES[selectedPc]} major`} description={`Relative minor: ${relativeName}`}>
          <p className="text-sm text-muted" data-circle-signature={signatureText(signature)}>
            {NOTE_NAMES[selectedPc]} major: {signatureText(signature)}.
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Diatonic triads">
            {triads.map((chord) => (
              <li key={chord.roman} className="rounded-md border border-line bg-raised px-2 py-0.5 font-mono text-sm">
                <span className="font-semibold">{chord.roman}</span> {chord.name}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  )
}
