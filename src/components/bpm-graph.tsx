import type { BpmGraphPoint } from '#/lib/progress'

const WIDTH = 600
const HEIGHT = 220
const PAD_LEFT = 44
const PAD_RIGHT = 16
const PAD_TOP = 16
const PAD_BOTTOM = 32

/** Dependency-free SVG line graph of max clean BPM over time. */
export function BpmGraph({ points }: { points: BpmGraphPoint[] }) {
  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM

  const times = points.map((point) => Date.parse(point.at))
  const minT = Math.min(...times)
  const span = Math.max(...times) - minT
  const minB = Math.max(1, Math.min(...points.map((point) => point.bpm)) - 5)
  const maxB = Math.max(...points.map((point) => point.bpm)) + 5

  const x = (t: number) =>
    span === 0 ? PAD_LEFT + innerW / 2 : PAD_LEFT + ((t - minT) / span) * innerW
  const y = (b: number) => PAD_TOP + innerH - ((b - minB) / (maxB - minB)) * innerH

  return (
    <div data-bpm-graph="true" data-points={points.length} className="w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Max clean BPM over time"
        className="w-full"
      >
        <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y(maxB)} y2={y(maxB)} stroke="var(--color-line)" />
        <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y(minB)} y2={y(minB)} stroke="var(--color-line)" />
        <text x={PAD_LEFT - 8} y={y(maxB) + 4} textAnchor="end" fontSize="12" fill="var(--color-muted)">
          {Math.round(maxB)}
        </text>
        <text x={PAD_LEFT - 8} y={y(minB) + 4} textAnchor="end" fontSize="12" fill="var(--color-muted)">
          {Math.round(minB)}
        </text>

        <polyline
          points={points.map((point, i) => `${x(times[i]).toFixed(1)},${y(point.bpm).toFixed(1)}`).join(' ')}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, i) => (
          <circle key={i} cx={x(times[i])} cy={y(point.bpm)} r="4" fill="var(--color-accent)" />
        ))}

        <text x={PAD_LEFT} y={HEIGHT - 8} fontSize="12" fill="var(--color-muted)">
          {points[0].at.slice(0, 10)}
        </text>
        {points.length > 1 ? (
          <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 8} textAnchor="end" fontSize="12" fill="var(--color-muted)">
            {points[points.length - 1].at.slice(0, 10)}
          </text>
        ) : null}
      </svg>
    </div>
  )
}
