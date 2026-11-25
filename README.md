# Guitar Trainer

A single-user, self-hosted web app for daily guitar practice: a precise metronome
with accents and subdivisions, plus guided practice sessions with per-section
timers, notes and history. All data stays on your machine in one SQLite file.

## Features (Phases 1–4)

**Metronome**

- 1–999 BPM (practical slider range 40–250), fine ±1 stepping
- Any time signature up to 16 beats, beat unit /2 /4 /8 /16
- Per-beat accents: normal / accent / dominant (tap to cycle; colorblind-safe `·`/`A`/`D` letters plus colour)
- Subdivisions: none, 8ths, 16ths, triplets, swing 8ths — with a live clicks/min readout
- Four click sounds, per-level volumes, count-in (0–2 bars), gap click (mute every other bar), optional haptics
- Tap tempo, and saved presets (built-ins are read-only)

**Practice sessions**

- Built-in *Daily 60* and *Emergency 20* templates plus your own custom templates (1–12 sections, 1–180 min each)
- Full or light sessions (light = half durations, 1-minute floor); rest days logged in one tap
- Weekly theme rotation (Mon–Sun), overridable per session
- Per-section countdown with pause/skip, section notes (≤4000 chars), auto-advance with chime (toggleable)
- One active session at a time; "one thing to fix this week" pinned into every session
- History of all sessions with totals

**Exercises & progress**

- Your own exercises (no built-ins): name, timed vs untimed, difficulty 1–5, up to 8 tags, optional tabs/notation text
- Timed exercises log max clean BPM, average BPM, duration and clean streak; a dependency-free SVG chart shows max clean BPM over time
- Untimed exercises log a self rating (1–5), duration and notes
- Progress logs attach to the active session when one is running, so history stays linked

**Workflow & data**

- Streak of consecutive covered UTC days (full, light and rest days all count; a rest day is the consolidation mechanism), shown on home
- One-tap mood at the end of practice sessions (energized / neutral / drained) with badges in session lists
- Weekly review card: pre-filled facts (practiced every day or emergency?, current streak) plus "one thing that improved" and "one thing to focus on next week"; the focus answer becomes the pinned one-thing note; one row per ISO week, re-savable
- Monthly progress check page with built-in milestone lists for months 1–2 / 3–4 / 5–6 / 7–12 (a reference, not ticked state)
- Data page: Markdown export, full JSON backup (versioned), session CSV for spreadsheets; restore from a JSON backup replaces all data transactionally and re-seeds built-ins; Markdown import reads the Templates section of an export (existing names are skipped)
- Installable PWA: web manifest, SVG icon and a service worker that caches the app shell (network-first). The server must be running for data changes — there is no offline data mode.

## Quickstart

Requires [Bun](https://bun.sh) ≥ 1.4.4.

```sh
bun install
bun run dev        # http://localhost:3000
```

Production build:

```sh
bun run build
bun run start      # serves .output on PORT (default 3000)
```

### Docker

```sh
docker compose up -d --build
# → http://localhost:${APP_PORT:-3000}
```

The database lives in the named volume `guitar-trainer-data` at
`/data/guitar-trainer.db`. The container runs as root only long enough to
create/restore ownership of the data directory, then drops to `PUID`/`PGID`
(default 1000:1000) via `su-exec`; a restored volume with foreign file
ownership is re-chowned automatically.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_PATH` | `data/guitar-trainer.db` | SQLite file; parent directories are created. |
| `PORT` | `3000` | Listen port. |
| `HOST` | `0.0.0.0` | Bind interface (`127.0.0.1` for local-only). |
| `APP_PORT` | `3000` | Host port published by `docker-compose.yml`. |
| `PUID` / `PGID` | `1000` / `1000` | UID/GID the app runs as inside Docker. |

Copy `.env.example` to `.env` and adjust if needed.

## Architecture

```
routes/ + components/   UI (TanStack Start, React 19, Tailwind v4)
        ↓ thin calls
src/server/api.ts       server functions; zod validation at every boundary
        ↓
src/server/repo.ts      all SQL (node:sqlite, WAL, foreign keys on)
        ↓
src/server/db.ts        connection, append-only migrations, idempotent seed
src/lib/                pure logic + canonical types (no I/O)
```

- **Server functions** are the trust boundary; there is no auth in the MVP
  (single user, self-hosted). They validate every input with zod before it
  reaches SQL.
- **Migrations** are append-only strings applied via `PRAGMA user_version`;
  built-in templates/presets are seeded idempotently and guarded against
  modification or deletion.
- The metronome uses a Web Audio look-ahead scheduler; its visual state lives
  in a ref polled at ~20 fps so the render loop never re-renders the page.

### Data model

`templates` (1–n) `template_sections` · `sessions` (1–n) `session_sections` ·
`exercises` (1–n) `exercise_progress` · `presets` · `weekly_reviews` (one row
per ISO week, upserted) · `app_state` (single row: weekly focus note). Sessions
snapshot the template's name and sections at start time, so editing a template
never rewrites history; they also carry an optional mood. Progress rows
optionally reference the active session (`ON DELETE SET NULL`) and cascade with
their exercise. Built-ins are flagged `is_builtin` and guarded in the repo.

## Testing

```sh
bun run test:all   # the gate: typecheck → lint → vitest (unit + integration) → Playwright e2e
```

- **Unit** (`tests/unit/`): pure metronome/session logic, progress-graph points
  and zod schemas.
- **Integration** (`tests/integration/`): the real repo against a real SQLite
  file in a temp dir (env set before import), covering seeding, templates,
  session lifecycle, clamping, rest days, presets, exercises + progress, the
  focus note, streak dates, moods, weekly reviews and full backup restore.
- **E2E** (`e2e/`, Playwright): production build served on `127.0.0.1:3100`
  with a fresh throwaway DB; 1 worker, no retries, traces/screenshots/HTML
  report on failure. System Chromium is used when present, otherwise the
  Playwright browser (`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to override).

TZ is pinned to UTC for tests and Docker; e2e runs with an `en-GB` locale.

## CI/CD

- `ci.yml`: on push/PR to `main` — parallel **check** (typecheck, lint,
  unit + integration) and **e2e** jobs on Bun 1.4.4; per-ref concurrency.
- `docker.yml`: on push to `main` and `v*` tags — builds the multi-stage image
  and pushes to Docker Hub as `latest` (default branch), short SHA, and the
  semver tag (`DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` secrets).

## Deliberately not built (post-MVP)

Phases 5–8 of the original spec are out of scope: speed trainer, focus mode,
audio attachment / reference takes (Phase 5), automatic Sunday theme selection
and everything beyond the metronome, sessions, exercises and workflow. Also
skipped in Phase 4: full offline data access (the PWA shell installs and loads
from cache, but data changes need the server running — an IndexedDB/WASM mirror
would be a separate project), File System Access API folder coexistence, and
Markdown import of session logs (import covers templates only). The
server-function layer is deliberately kept as a thin validated boundary so a
future auth layer can slot in without restructuring.
