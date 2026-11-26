import { Link, createFileRoute } from '@tanstack/react-router'
import { MODES, SCALE_TYPES } from '#/lib/theory'
import { Card } from '#/components/ui/card'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/genres')({
  component: GenresPage,
})

/** Curated genre → scale types; the mode list is derived from MODES.genres. */
const GENRES: { name: string; scaleIds: string[] }[] = [
  { name: 'Blues', scaleIds: ['minor-pentatonic', 'blues'] },
  { name: 'Jazz', scaleIds: ['bebop-dominant', 'major'] },
  { name: 'Rock', scaleIds: ['minor-pentatonic', 'major-pentatonic'] },
  { name: 'Country', scaleIds: ['major-pentatonic', 'major'] },
  { name: 'Flamenco', scaleIds: ['natural-minor'] },
]

function modesFor(genre: string) {
  return MODES.filter((mode) =>
    mode.genres.split(',').map((tag) => tag.trim().toLowerCase()).includes(genre.toLowerCase()),
  )
}

function GenresPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Genres"
        description="Which scales and modes fit each genre — a starting point, not a rule."
      />
      <div className="flex flex-col gap-4">
        {GENRES.map((genre) => {
          const scaleNames = genre.scaleIds
            .map((id) => SCALE_TYPES.find((type) => type.id === id)?.name ?? id)
          const modes = modesFor(genre.name)
          return (
            <Card key={genre.name} title={genre.name}>
              <p className="text-sm">
                <span className="text-muted">Scales:</span> {scaleNames.join(' · ')}{' '}
                <Link to="/scales" className="text-accent underline">
                  Open scale library
                </Link>
              </p>
              <p className="mt-2 text-sm">
                <span className="text-muted">Modes:</span>{' '}
                {modes.length === 0 ? (
                  'none tagged for this genre yet.'
                ) : (
                  <>
                    {modes.map((mode, i) => (
                      <span key={mode.id}>
                        {i > 0 && ', '}
                        {mode.name}
                        <span className="text-muted"> — {mode.character}</span>
                      </span>
                    ))}{' '}
                    <Link to="/modes" className="text-accent underline">
                      Open modes
                    </Link>
                  </>
                )}
              </p>
            </Card>
          )
        })}
      </div>
    </main>
  )
}
