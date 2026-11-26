import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { NOTE_NAMES, midiName } from '#/lib/ear'
import {
  SCALE_TYPES,
  neckNotes,
  scaleNoteNames,
  scaleTypeById,
} from '#/lib/theory'
import { playMidiNotes } from '#/components/ear/synth'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/scales')({
  component: ScalesPage,
})

const MAX_FRET = 12
const NOTE_SECONDS = 0.35
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

  const [fromFret, setFromFret] = useState(0)
  const [toFret, setToFret] = useState(7)
  const [playing, setPlaying] = useState(false)
  const [playingIndex, setPlayingIndex] = useState(-1)
  const [error, setError] = useState('')

  // The practice window; swapped if the user enters it backwards.
  const lo = Math.min(fromFret, toFret)
  const hi = Math.max(fromFret, toFret)
  const inWindow = neck.filter((note) => note.fret >= lo && note.fret <= hi)
  // Up and back down: the way scales are actually practiced.
  const sequence = [...inWindow, ...[...inWindow].reverse().slice(1, -1)]

  async function playWindow() {
    setError('')
    if (sequence.length === 0) return
    setPlaying(true)
    try {
      for (let i = 0; i < sequence.length; i += 1) {
        setPlayingIndex(i)
        await playMidiNotes([sequence[i].midi], { noteDuration: NOTE_SECONDS, gap: 0 })
        await sleep((NOTE_SECONDS + 0.1) * 1000)
      }
    } catch {
      setError('Audio is not available in this browser.')
    } finally {
      setPlayingIndex(-1)
      setPlaying(false)
    }
  }

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
          <ScaleNeck
            neck={neck}
            pcToName={pcToName}
            lo={lo}
            hi={hi}
            playingIndex={playingIndex}
            sequence={sequence}
          />
        </Card>
        <Card title="Practice window">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="From fret" htmlFor="window-from">
              <input
                id="window-from"
                type="number"
                min={0}
                max={MAX_FRET}
                className={controlClass}
                value={fromFret}
                onChange={(event) => setFromFret(clampFret(event.target.value))}
              />
            </Field>
            <Field label="To fret" htmlFor="window-to">
              <input
                id="window-to"
                type="number"
                min={0}
                max={MAX_FRET}
                className={controlClass}
                value={toFret}
                onChange={(event) => setToFret(clampFret(event.target.value))}
              />
            </Field>
            <Button
              onClick={() => void playWindow()}
              disabled={playing || inWindow.length === 0}
              data-practice-play="true"
            >
              {playing ? 'Playing…' : `Play ${inWindow.length} notes`}
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted" data-window-count={inWindow.length}>
            {inWindow.length} note{inWindow.length === 1 ? '' : 's'} in frets {lo}–{hi}.
          </p>
          {error !== '' ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </Card>
      </div>
    </main>
  )
}

function clampFret(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.min(MAX_FRET, parsed))
}

const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const // high e → low E

function ScaleNeck({
  neck,
  pcToName,
  lo,
  hi,
  playingIndex,
  sequence,
}: {
  neck: ReturnType<typeof neckNotes>
  pcToName: Map<number, string>
  lo: number
  hi: number
  playingIndex: number
  sequence: ReturnType<typeof neckNotes>
}) {
  const x = (fret: number) => 26 + fret * 36
  const y = (stringIndex: number) => 24 + stringIndex * 34

  return (
    <svg viewBox="0 0 495 235" className="w-full" role="img" aria-label="Scale notes on the fretboard">
      {/* fret wires and numbers */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((fret) => (
        <line key={fret} x1={x(fret)} x2={x(fret)} y1={y(0)} y2={y(5)} className="stroke-line" />
      ))}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((fret) => (
        <text
          key={fret}
          x={x(fret)}
          y={14}
          textAnchor="middle"
          className={fret % 3 === 0 ? 'fill-ink text-[11px] font-semibold' : 'fill-muted text-[10px]'}
        >
          {fret}
        </text>
      ))}
      {/* open-string markers on the nut */}
      {neck
        .filter((note) => note.fret === 0)
        .map((note) => (
          <circle key={`open-${note.stringIndex}`} cx={x(0)} cy={y(5 - note.stringIndex)} r={9} fill="none" className="stroke-muted" />
        ))}
      {STRING_LABELS.map((label, row) => (
        <text key={label} x={8} y={y(row) + 4} textAnchor="middle" className="fill-muted text-[11px]">
          {label}
        </text>
      ))}
      {neck.map((note) => {
        const inRange = note.fret >= lo && note.fret <= hi
        const isPlaying = playingIndex >= 0 && sequence[playingIndex]?.midi === note.midi && sequence[playingIndex]?.stringIndex === note.stringIndex
        return (
          <g key={`${note.stringIndex}-${note.fret}`} data-note={inRange ? 'true' : 'false'}>
            {isPlaying ? <circle cx={x(note.fret) + 18} cy={y(5 - note.stringIndex)} r={14} fill="none" className="stroke-accent" strokeWidth={2.5} /> : null}
            <circle
              cx={x(note.fret) + 18}
              cy={y(5 - note.stringIndex)}
              r={10}
              className={inRange ? 'fill-accent' : 'fill-line'}
            />
            <text
              x={x(note.fret) + 18}
              y={y(5 - note.stringIndex) + 3.5}
              textAnchor="middle"
              className={inRange ? 'fill-accent-ink text-[9px] font-semibold' : 'fill-muted text-[9px]'}
            >
              {pcToName.get(note.midi % 12) ?? midiName(note.midi)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
