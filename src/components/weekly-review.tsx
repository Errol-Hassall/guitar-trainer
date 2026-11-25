import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import type { WeeklyReview } from '#/lib/types'
import { saveWeeklyReview } from '#/server/api'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Field, controlClass } from './ui/field'

export function WeeklyReviewCard({
  weekStart,
  currentReview,
  practicedEveryday,
  streakCount,
  recentReviews,
}: {
  weekStart: string
  currentReview: WeeklyReview | null
  practicedEveryday: boolean
  streakCount: number
  recentReviews: WeeklyReview[]
}) {
  const router = useRouter()
  const [improved, setImproved] = useState('')
  const [focus, setFocus] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await saveWeeklyReview({
        data: { weekStart, practicedEveryday, streakCount, improved, focus },
      })
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the review.')
      setBusy(false)
    }
  }

  return (
    <Card
      title="Weekly review"
      description={`Week of ${weekStart.slice(0, 4)}-${weekStart.slice(5, 7)}-${weekStart.slice(8, 10)}.`}
      actions={currentReview ? <Badge variant="success">Done</Badge> : undefined}
    >
      {currentReview ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-4" aria-hidden="true" /> Reviewed this week.
          </p>
          {currentReview.improved !== '' ? (
            <p>
              <span className="text-muted">Improved:</span> {currentReview.improved}
            </p>
          ) : null}
          {currentReview.focus !== '' ? (
            <p>
              <span className="text-muted">Focus:</span> {currentReview.focus}
            </p>
          ) : null}
          {recentReviews.length > 1 ? (
            <ul className="mt-2 flex flex-col gap-1 border-t border-line pt-3 text-muted">
              {recentReviews.slice(1, 4).map((review) => (
                <li key={review.weekStart}>
                  Week {review.weekStart} · streak {review.streakCount}
                  {review.focus !== '' ? ` · ${review.focus}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {error ? (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-raised px-3 py-2">
              <dt className="text-xs text-muted">Practiced every day (or emergency)?</dt>
              <dd className={practicedEveryday ? 'font-medium text-success' : 'font-medium'}>
                {practicedEveryday ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="rounded-lg border border-line bg-raised px-3 py-2">
              <dt className="text-xs text-muted">Current streak</dt>
              <dd className="font-medium">{streakCount} day{streakCount === 1 ? '' : 's'}</dd>
            </div>
          </dl>

          <Field label="One thing that improved" htmlFor="review-improved">
            <textarea
              id="review-improved"
              rows={2}
              maxLength={4000}
              value={improved}
              onChange={(event) => setImproved(event.target.value)}
              placeholder="e.g. 16ths finally sit on the click"
              className={controlClass}
            />
          </Field>

          <Field
            label="One thing to focus on next week"
            htmlFor="review-focus"
            hint="Becomes the pinned one-thing note."
          >
            <textarea
              id="review-focus"
              rows={2}
              maxLength={4000}
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              placeholder="e.g. Slurs under the metronome"
              className={controlClass}
            />
          </Field>

          <Button type="submit" disabled={busy}>
            Save review
          </Button>
        </form>
      )}
    </Card>
  )
}
