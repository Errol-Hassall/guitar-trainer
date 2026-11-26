import { midiName } from '#/lib/ear'
import type { NeckNote } from '#/lib/theory'

const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const // high e → low E

/** Six strings, twelve frets, dots for every note in `neck`. */
export function Fretboard({
  neck,
  pcToName,
  lo,
  hi,
  playingIndex,
  sequence,
  label,
}: {
  neck: NeckNote[]
  /** Optional per-pitch-class spelling (e.g. C blues shows Gb, not F#). */
  pcToName?: Map<number, string>
  lo: number
  hi: number
  playingIndex: number
  sequence: NeckNote[]
  label: string
}) {
  const x = (fret: number) => 26 + fret * 36
  const y = (stringIndex: number) => 24 + stringIndex * 34

  return (
    <svg viewBox="0 0 495 235" className="w-full" role="img" aria-label={label}>
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
        const isPlaying =
          playingIndex >= 0 &&
          sequence[playingIndex]?.midi === note.midi &&
          sequence[playingIndex]?.stringIndex === note.stringIndex
        return (
          <g key={`${note.stringIndex}-${note.fret}`}>
            {isPlaying ? (
              <circle cx={x(note.fret) + 18} cy={y(5 - note.stringIndex)} r={14} fill="none" className="stroke-accent" strokeWidth={2.5} />
            ) : null}
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
              {pcToName?.get(note.midi % 12) ?? midiName(note.midi)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
