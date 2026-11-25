import { createFileRoute } from '@tanstack/react-router'
import { Card } from '#/components/ui/card'
import { PageHeader } from '#/components/ui/page-header'

const MILESTONES: { range: string; items: string[] }[] = [
  {
    range: 'Months 1–2 — Building the habit',
    items: [
      'Practise on most days; use Emergency 20 when time is short',
      'Log rest days deliberately instead of just skipping',
      'Keep a streak alive — never skip two days in a row',
      'Play your core drills with the metronome at a tempo you can keep clean',
      'Complete a full 60-minute session at least three times a week',
    ],
  },
  {
    range: 'Months 3–4 — Raising the bar',
    items: [
      'Max clean BPM on your core drills trends up week over week',
      'Light sessions feel as useful as full ones when you are tired',
      'The weekly one-thing actually changes what you practise',
      'Clean streaks get longer before mistakes appear',
      'You can name one thing that improved this week without thinking hard',
    ],
  },
  {
    range: 'Months 5–6 — Consolidation',
    items: [
      'Streaks survive busy weeks using rest days and Emergency 20',
      'You play through a full piece with the metronome, start to finish',
      'Self-ratings on untimed work feel honest rather than generous',
      'Weekly reviews get done without being prompted',
      'Your practice plan is yours — not just the default template',
    ],
  },
  {
    range: 'Months 7–12 — Depth and independence',
    items: [
      'Multi-week streaks with only planned rest breaks',
      'Target tempos on signature drills hold up when tired or rushed',
      'You design new exercises for the weaknesses you find',
      'Mood and energy patterns tell you when to push and when to consolidate',
      'You could explain what you are doing, and why, to another player',
    ],
  },
]

export const Route = createFileRoute('/progress')({ component: ProgressPage })

function ProgressPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Monthly progress check"
        description="Work through the band that matches where you are, at the end of each month. No ticking — just an honest check."
      />
      <div className="flex flex-col gap-4">
        {MILESTONES.map((phase) => (
          <Card key={phase.range} title={phase.range}>
            <ul className="flex flex-col gap-2 text-sm">
              {phase.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </main>
  )
}
