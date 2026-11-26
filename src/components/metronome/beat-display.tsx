import { useEffect, useState } from 'react'
import type { AccentLevel } from '#/lib/types'
import { ACCENT_LABELS, ACCENT_SHORT } from '#/lib/types'
import type { MetronomeVisual } from './use-metronome'
import { Progress } from '../ui/progress'

function visualKey(visual: MetronomeVisual): string {
  return [
    visual.state,
    visual.beat,
    visual.countInRemaining,
    visual.barProgress.toFixed(2),
    visual.beatProgress.toFixed(2),
  ].join('|')
}

export function BeatDisplay({
  beats,
  offsets,
  accents,
  getVisual,
}: {
  beats: number
  /** Tick positions within a beat (from subdivisionOffsets); dividers sit between them. */
  offsets: number[]
  accents: AccentLevel[]
  getVisual: () => MetronomeVisual
}) {
  const [visual, setVisual] = useState<MetronomeVisual>(getVisual)

  useEffect(() => {
    // Poll the scheduler's visual state; the hook itself never re-renders.
    const id = window.setInterval(() => {
      const next = getVisual()
      setVisual((previous) => (visualKey(previous) === visualKey(next) ? previous : next))
    }, 50)
    return () => clearInterval(id)
  }, [getVisual])

  return (
    <div
      data-metronome-state={visual.state}
      data-beat={visual.state === 'playing' ? visual.beat + 1 : 0}
      data-count-in-remaining={visual.countInRemaining}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between text-sm">
        {visual.state === 'count-in' ? (
          <span className="font-medium text-teal" role="status">
            Count-in: {visual.countInRemaining} beat
            {visual.countInRemaining === 1 ? '' : 's'} left
          </span>
        ) : visual.state === 'playing' ? (
          <span className="font-medium text-accent" role="status">
            Beat {visual.beat + 1} of {beats}
          </span>
        ) : (
          <span className="text-muted">Ready</span>
        )}
        <span className="sr-only">
          {visual.state === 'playing'
            ? `Playing, beat ${visual.beat + 1}`
            : visual.state === 'count-in'
              ? 'Counting in'
              : 'Stopped'}
        </span>
      </div>

      <div className="flex items-end gap-2" aria-hidden="true">
        {Array.from({ length: beats }, (_, index) => {
          const fill =
            visual.state === 'playing'
              ? index < visual.beat
                ? 1
                : index === visual.beat
                  ? visual.beatProgress
                  : 0
              : 0
          const level = accents[index] ?? 0
          const isCurrent =
            visual.state === 'playing' && index === visual.beat
          return (
            <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                className={`text-xs font-semibold ${
                  level === 2
                    ? 'text-accent'
                    : level === 1
                      ? 'text-teal'
                      : level === 3
                        ? 'text-muted line-through'
                        : 'text-muted/70'
                }`}
              >
                {ACCENT_SHORT[level]}
              </span>
              <div className="relative h-24 w-full max-w-12 overflow-hidden rounded-md border border-line bg-raised">
                <div
                  className="absolute inset-x-0 bottom-0 bg-accent"
                  style={{ height: `${fill * 100}%` }}
                />
                {offsets.slice(1).map((offset) => (
                  <span
                    key={offset}
                    className="absolute inset-x-0 border-t border-bg/70"
                    style={{ bottom: `${offset * 100}%` }}
                  />
                ))}
              </div>
              <span
                className={`text-xs ${isCurrent ? 'font-semibold text-accent' : 'text-muted'}`}
              >
                {index + 1}
              </span>
            </div>
          )
        })}
      </div>

      <Progress
        value={visual.barProgress * 100}
        label="Position within the current bar"
      />

      <p className="sr-only">
        Accent pattern:{' '}
        {accents.map((level, index) => `beat ${index + 1} ${ACCENT_LABELS[level]}`).join(', ')}
      </p>
    </div>
  )
}
