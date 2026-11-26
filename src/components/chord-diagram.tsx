import type { ChordDiagram } from '#/lib/theory'

const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const // low E → high e

/** SVG chord chart: six strings, four frets, dots for fingered notes. */
export function ChordDiagramChart({ diagram }: { diagram: ChordDiagram }) {
  const x = (stringIndex: number) => 18 + stringIndex * 22
  const y = (fretRow: number) => 34 + fretRow * 26
  return (
    <svg
      viewBox="0 0 150 140"
      className="h-40 w-40"
      role="img"
      aria-label={`${diagram.name} chord diagram`}
      data-chord-name={diagram.name}
    >
      {diagram.baseFret > 1 ? (
        <text x={x(2)} y={16} textAnchor="middle" className="fill-muted text-[10px]">
          {diagram.baseFret}fr
        </text>
      ) : null}
      {/* fret wires; the nut is drawn thicker */}
      {[0, 1, 2, 3, 4].map((row) => (
        <line
          key={row}
          x1={x(0)}
          x2={x(5)}
          y1={y(row)}
          y2={y(row)}
          className={row === 0 && diagram.baseFret === 1 ? 'stroke-ink' : 'stroke-line'}
          strokeWidth={row === 0 && diagram.baseFret === 1 ? 3 : 1}
        />
      ))}
      {diagram.frets.map((fret, stringIndex) => (
        <g key={stringIndex}>
          <line x1={x(stringIndex)} x2={x(stringIndex)} y1={y(0)} y2={y(4)} className="stroke-line" />
          {fret === null ? (
            <text x={x(stringIndex)} y={26} textAnchor="middle" className="fill-muted text-[11px]">
              ×
            </text>
          ) : fret === 0 ? (
            <circle cx={x(stringIndex)} cy={23} r={5} fill="none" className="stroke-muted" />
          ) : null}
        </g>
      ))}
      {diagram.frets.map((fret, stringIndex) =>
        fret !== null && fret > 0 ? (
          <circle
            key={`${stringIndex}-${fret}`}
            cx={x(stringIndex)}
            cy={(y(fret - diagram.baseFret) + y(fret - diagram.baseFret + 1)) / 2}
            r={8}
            className="fill-accent"
          >
            <title>{`${STRING_LABELS[stringIndex]} string, fret ${fret}`}</title>
          </circle>
        ) : null,
      )}
    </svg>
  )
}
