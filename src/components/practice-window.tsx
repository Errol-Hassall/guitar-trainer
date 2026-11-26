import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import type { useNeckPlayback } from '#/hooks/use-neck-playback'

const MAX_FRET = 12

function clampFret(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.min(MAX_FRET, parsed))
}

/** Fret-window controls plus the play-back button for a `useNeckPlayback` instance. */
export function PracticeWindowCard({ playback }: { playback: ReturnType<typeof useNeckPlayback> }) {
  const { fromFret, toFret, setFromFret, setToFret, lo, hi, inWindow, playing, error, play } = playback

  return (
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
        <Button onClick={() => void play()} disabled={playing || inWindow.length === 0} data-practice-play="true">
          {playing ? 'Playing…' : `Play ${inWindow.length} notes`}
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted" data-window-count={inWindow.length}>
        {inWindow.length} note{inWindow.length === 1 ? '' : 's'} in frets {lo}–{hi}.
      </p>
      {error !== '' ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </Card>
  )
}
