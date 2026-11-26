import { useEffect, useState, type ReactNode } from 'react'
import {
  createRootRoute,
  HeadContent,
  Link,
  Scripts,
} from '@tanstack/react-router'
import { Guitar, Moon, Sun } from 'lucide-react'
import { APP_NAME } from '#/lib/types'
import { MetronomeProvider, useGlobalMetronome } from '#/components/metronome/global-metronome'
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
    links: [{ rel: 'manifest', href: '/manifest.webmanifest' }],
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
        {/* Pre-paint theme restore, before the body renders: no flash of the default. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try { if (localStorage.getItem('theme') === 'light') document.documentElement.dataset.theme = 'light' } catch {}`,
          }}
        />
      </head>
      <body>
        <MetronomeProvider>
        <header className="border-b border-line bg-surface/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link to="/" className="flex min-h-11 items-center gap-2 font-semibold">
              <Guitar className="size-5 text-accent" aria-hidden="true" />
              {APP_NAME}
            </Link>
            <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
              {[
                { to: '/', label: 'Home' },
                { to: '/metronome', label: 'Metronome' },
                { to: '/recordings', label: 'Recordings' },
                { to: '/tracks', label: 'Tracks' },
                { to: '/tuner', label: 'Tuner' },
                { to: '/templates', label: 'Templates' },
                { to: '/exercises', label: 'Exercises' },
                { to: '/learning', label: 'Learning' },
                { to: '/ear', label: 'Ear' },
                { to: '/intervals', label: 'Intervals' },
                { to: '/chords', label: 'Chords' },
                { to: '/scales', label: 'Scales' },
                { to: '/arpeggios', label: 'Arpeggios' },
                { to: '/keys', label: 'Keys' },
                { to: '/circle', label: 'Circle' },
                { to: '/modes', label: 'Modes' },
                { to: '/genres', label: 'Genres' },
                { to: '/trainer', label: 'Trainer' },
                { to: '/licklab', label: 'LickLab' },
                { to: '/history', label: 'History' },
                { to: '/progress', label: 'Progress' },
                { to: '/data', label: 'Data' },
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
              <MetronomeIndicator />
              <ThemeToggle />
            </nav>
          </div>
        </header>
        {children}
        </MetronomeProvider>
        <Scripts />
        {import.meta.env.PROD ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js') }) }`,
            }}
          />
        ) : null}
      </body>
    </html>
  )
}

/** Dark is the default (no attribute); light is persisted in localStorage. */
function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    // The pre-paint script may have restored a saved choice before hydration.
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    if (next === 'light') document.documentElement.dataset.theme = 'light'
    else delete document.documentElement.dataset.theme
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Storage unavailable (private mode): the choice just will not persist.
    }
    setTheme(next)
  }

  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      data-theme-toggle={theme}
      className="flex min-h-11 items-center rounded-lg px-2 text-muted transition-colors hover:bg-raised hover:text-ink"
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  )
}

/** Live "running at N BPM" chip; only visible while the global metronome plays. */
function MetronomeIndicator() {
  const { isPlaying, bpm } = useGlobalMetronome()
  if (!isPlaying) return null
  return (
    <Link
      to="/metronome"
      data-metronome-indicator="true"
      className="flex min-h-11 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-ink"
    >
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent-ink" />
      {bpm} BPM
    </Link>
  )
}
