import type { ReactNode } from 'react'
import {
  createRootRoute,
  HeadContent,
  Link,
  Scripts,
} from '@tanstack/react-router'
import { Guitar } from 'lucide-react'
import { APP_NAME } from '#/lib/types'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { name: 'theme-color', content: '#090d12' },
      { title: APP_NAME },
      {
        name: 'description',
        content: 'A private metronome and practice-session timer for guitarists.',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">That page does not exist.</p>
      <Link to="/" className="mt-6 inline-block text-accent underline">
        Back home
      </Link>
    </main>
  ),
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">
        {error instanceof Error ? error.message : 'Unexpected error.'}
      </p>
      <Link to="/" className="mt-6 inline-block text-accent underline">
        Back home
      </Link>
    </main>
  ),
})

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="border-b border-line bg-surface/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link to="/" className="flex min-h-11 items-center gap-2 font-semibold">
              <Guitar className="size-5 text-accent" aria-hidden="true" />
              {APP_NAME}
            </Link>
            <nav aria-label="Main" className="flex items-center gap-1">
              {[
                { to: '/', label: 'Home' },
                { to: '/metronome', label: 'Metronome' },
                { to: '/templates', label: 'Templates' },
                { to: '/history', label: 'History' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === '/' }}
                  className="flex min-h-11 items-center rounded-lg px-3 text-sm text-muted transition-colors hover:bg-raised hover:text-ink"
                  activeProps={{
                    className:
                      'flex min-h-11 items-center rounded-lg px-3 text-sm bg-raised text-ink',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
