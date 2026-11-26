import { Link, createFileRoute } from '@tanstack/react-router'
import type { EarStat } from '#/lib/types'
import { CHORD_QUALITY_LEVELS, EAR_DRILLS } from '#/lib/ear'
import { listEarStats } from '#/server/api'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/ear/')({
  component: EarPage,
  loader: () => listEarStats(),
})

function statLine(drill: (typeof EAR_DRILLS)[number]['id'], level: number, stats: EarStat[]) {
  const stat = stats.find((item) => item.drill === drill && item.level === level)
  if (!stat || stat.attempts === 0) return 'Not practiced yet'
  const percent = Math.round((stat.correct / stat.attempts) * 100)
  const avgSeconds = (stat.totalResponseMs / stat.attempts / 1000).toFixed(1)
  return `${stat.attempts} answers · ${percent}% correct · best streak ${stat.bestStreak} · ~${avgSeconds}s each`
}

function EarPage() {
  const stats = Route.useLoaderData() as EarStat[]

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Ear Training"
        description="Listen, then name what you heard. Ten prompts per round; your accuracy is kept per drill."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {EAR_DRILLS.map((drill) => (
          <Card
            key={drill.id}
            title={drill.name}
            description={drill.description}
            actions={
              drill.id === 'chord-quality' ? (
                <div className="flex items-center gap-2">
                  <Link to="/ear/$drill" params={{ drill: drill.id }} search={{ level: 1 }}>
                    <Button variant="secondary" size="sm">
                      Level 1
                    </Button>
                  </Link>
                  <Link to="/ear/$drill" params={{ drill: drill.id }} search={{ level: 2 }}>
                    <Button variant="secondary" size="sm">
                      Level 2
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link to="/ear/$drill" params={{ drill: drill.id }} search={{ level: 1 }}>
                  <Button variant="secondary" size="sm">
                    Practice
                  </Button>
                </Link>
              )
            }
          >
            {drill.id === 'chord-quality' ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{statLine('chord-quality', 1, stats)}</Badge>
                <Badge variant="teal">
                  Level 2 ({CHORD_QUALITY_LEVELS[2].length} qualities):{' '}
                  {statLine('chord-quality', 2, stats)}
                </Badge>
              </div>
            ) : (
              <Badge variant={drill.id === 'transcription' ? 'accent' : 'default'}>
                {drill.id === 'transcription' ? 'Practice helper · not scored' : statLine(drill.id, 1, stats)}
              </Badge>
            )}
          </Card>
        ))}
      </div>
    </main>
  )
}
