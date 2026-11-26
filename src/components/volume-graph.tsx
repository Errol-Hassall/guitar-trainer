import type { SessionSummary } from '#/lib/types'
import { dailyVolume, VOLUME_DAYS } from '#/lib/progress'

const WIDTH = 600
const HEIGHT = 220
const PAD_LEFT = 44
const PAD_RIGHT = 16
const PAD_TOP = 16
const PAD_BOTTOM = 32

/** Dependency-free SVG bar chart of practice minutes per day. */
export function VolumeGraph({ sessions }: { sessions: SessionSummary[] }) {
  const days = dailyVolume(sessions)
  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const maxMinutes = Math.max(5, ...days.map((day) => day.minutes))
  const slot = innerW / VOLUME_DAYS

  return (
    <div data-volume-graph="true" data-days={days.length} className="w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Practice minutes per day over the last ${VOLUME_DAYS} days`}
        className="w-full"
      >
        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={PAD_TOP + innerH}
          y2={PAD_TOP + innerH}
          stroke="var(--color-line)"
        />
        <text x={PAD_LEFT - 8} y={PAD_TOP + 4} textAnchor="end" fontSize="12" fill="var(--color-muted)">
          {maxMinutes} min
        </text>

        {days.map((day, index) =>
          day.minutes === 0 ? null : (
            <rect
              key={day.date}
              x={PAD_LEFT + index * slot + slot * 0.2}
              y={PAD_TOP + innerH - (day.minutes / maxMinutes) * innerH}
              width={slot * 0.6}
              height={(day.minutes / maxMinutes) * innerH}
              rx="2"
              fill="var(--color-accent)"
            />
          ),
        )}

        <text x={PAD_LEFT} y={HEIGHT - 8} fontSize="12" fill="var(--color-muted)">
          {days[0].date}
        </text>
        <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 8} textAnchor="end" fontSize="12" fill="var(--color-muted)">
          {days[days.length - 1].date}
        </text>
      </svg>
    </div>
  )
}
