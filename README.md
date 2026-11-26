# Guitar Trainer

A single-user, self-hosted web app for daily guitar practice: a precise metronome
with accents and subdivisions, plus guided practice sessions with per-section
timers, notes and history. All data stays on your machine in one SQLite file.

## Features (Phases 1–8)

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

**Learning paths**

- Four curated built-in paths mirroring the weekly rotation themes (*Clean Foundations*, *Alternate Picking 101 → 301*, *Legato & Groove*, *Accuracy & Transcription*), each an ordered chain of steps with prerequisites
- Skill-tree view: each step is locked until its prerequisite is complete; completing a step unlocks the next, and clearing a step that completed steps depend on is rejected
- Steps link out to external resources (YouTube searches / books) and to in-app drills where one fits

**Chord library**

- Standard fingerings for the 20 most common chords (open, barre and sevenths) as SVG charts with a copy-as-ASCII button
- "Chords in a key": the seven diatonic triads or sevenths of any major key with Roman numerals, qualities and the key signature; correctly spelled for sharp keys (F# major ends in E#)

**Ear training**

- Four scored drills, all synthesized in the browser with Web Audio (no samples): **Intervals** (the ten standard ones), **Scale degrees** (major scale 1–7, tonic played first), **Chord quality** (level 1 major/minor, level 2 adds maj7/min7/dom7) and **Progressions** (four common diatonic three-chord progressions)
- Ten prompts per round: listen as often as you like, tap the answer, get instant feedback; accuracy is kept per drill/level and shown on the drill list
- **Transcription helper** (unscored): a 2–4 note stepwise phrase to sing first and then find on the guitar, with a reveal button — and an optional mic take saved straight into the recordings store (Phase 5), playable back next to the original flow

**Exercises & progress**

- A seeded library of common built-in drills (read-only, like templates and presets) alongside your own exercises: name, timed vs untimed, difficulty 1–5, up to 8 tags, optional tabs/notation text
- Timed exercises log max clean BPM, average BPM, duration and clean streak; a dependency-free SVG chart shows max clean BPM over time
- Untimed exercises log a self rating (1–5), duration and notes
- Progress logs attach to the active session when one is running, so history stays linked

**Audio tools**

- One-tap recording from the microphone, auto-tagged to the active session and any chosen exercise; waveform playback with an optional metronome click overlay at any BPM
- A/B compare: pick take A and take B and they play back-to-back
- One reference take per exercise (star a take; it appears as a chip on the exercise page)
- Backing tracks from an audio file or an http(s) URL; tempo 50–200% via time-stretch that preserves pitch (practice-grade WSOLA), plus an independent −12…+12 semitone shift
- A/B loop points with looping, a gradual speed ramp across passes, and a track-volume slider for fading the track under your playing
- Chromatic tuner (YIN pitch detection) with an optional target note so bends can be checked in cents

**Workflow & data**

- Streak of consecutive covered UTC days (full, light and rest days all count; a rest day is the consolidation mechanism), shown on home
- One-tap mood at the end of practice sessions (energized / neutral / drained) with badges in session lists
- Weekly review card: pre-filled facts (practiced every day or emergency?, current streak) plus "one thing that improved" and "one thing to focus on next week"; the focus answer becomes the pinned one-thing note; one row per ISO week, re-savable
- Monthly progress check page with built-in milestone lists for months 1–2 / 3–4 / 5–6 / 7–12 (a reference, not ticked state)
- Data page: Markdown export, full JSON backup (versioned), session CSV for spreadsheets; restore from a JSON backup replaces all data transactionally and re-seeds built-ins; Markdown import reads the Templates and Exercises sections of an export — exercise packs import idempotently (existing names are skipped)
- Installable PWA: web manifest, SVG icon and a service worker that caches the app shell (network-first). The server must be running for data changes — there is no offline data mode.

**Hands-free & spaced repetition**

- Foot-pedal keys on the active session page — `Space` start/pause, `N` next section, `T` tap tempo; works with any USB/Bluetooth pedal that emulates a keyboard (bind it to those keys)
- Opt-in voice commands while a session runs: “next”, “repeat” (restart the section clock) and “slower” (metronome −10 BPM) via the browser’s speech recognition — Chromium-based browsers only, mic access is never requested until you switch it on
- XL touch targets for start/pause, next section and tap tempo, reachable with a foot or elbow
- **Due for review** on home: exercises practiced at least once but untouched for 7+ days, most stale first (never-practiced exercises are not “due” — there is nothing to review yet)
- **Suggested focus** card: a rule-based session suggestion from your practice data (due reviews, streak, activity this week) — deterministic and local, no model call

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
their exercise. Built-ins are flagged `is_builtin` (templates, presets and
exercises) and guarded in the repo. Learning paths live in
`learning_paths` (1–n) `path_steps`, where each step optionally references a
prerequisite step (`requires_step_id`) and an in-app drill; completion state is
one row per done step in `path_step_state`. Ear-training scores live in
`ear_stats`, one cumulative row per drill and level (`attempts` / `correct`).
Spaced repetition needs no table of its own: the “last practiced” date is a
derived column (latest `exercise_progress.completed_at`) on the exercise list.
Recordings, backing tracks, learning-path progress and ear scores live in
`recordings` / `tracks` / `path_step_state` / `ear_stats`; all four are
deliberately excluded from the v1 JSON backup, so restoring an old backup
leaves existing audio, path progress and drill accuracy untouched.

## Testing

```sh
bun run test:all   # the gate: typecheck → lint → vitest (unit + integration) → Playwright e2e
```

- **Unit** (`tests/unit/`): pure metronome/session logic, progress-graph points,
  WSOLA time-stretch / YIN pitch detection, ear-drill question generation
  (seeded RNG, diatonic correctness, difficulty tiers), review-due dates and
  focus suggestions, and zod schemas.
- **Integration** (`tests/integration/`): the real repo against a real SQLite
  file in a temp dir (env set before import), covering seeding, templates,
  session lifecycle, clamping, rest days, presets, exercises + progress,
  learning-path lock/unlock rules, built-in exercise guards, exercise-pack
  import, ear-stat accumulation, the focus note, streak dates, moods, weekly
  reviews, recordings/tracks and full backup restore.
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

Feature gaps vs [hoksai.online](https://hoksai.online/) (chord/scale library, rhythm
trainer, LickLab, …) are catalogued in [FUTURE_FEATURES.md](FUTURE_FEATURES.md).
Also skipped in the chord library: fingerings for exotic barre positions beyond the 20
common chords (the diatonic-in-key lookup still lists them by name), PNG export of
diagrams (copy-as-ASCII instead) and finger numbers on charts.

The remaining items from the original spec are out of scope: speed trainer,
focus mode, automatic Sunday theme selection and everything beyond the
metronome, sessions, exercises, learning content, ear training, audio tools and
workflow. Also skipped in Phase 8: WebHID binding for specific foot-pedal
devices (the key bindings work with any keyboard-emulating pedal instead),
voice control on non-Chromium browsers, LLM-based guidance (rule-based local
heuristics instead — no API key, no network), per-exercise review intervals
(one fixed 7-day interval) and any history of past suggestions. Also skipped in Phase 7: adaptive difficulty (FET-style option sets
that expand as accuracy improves — fixed option sets per drill/level instead),
scale degrees beyond the major scale (natural minor / pentatonic come later),
intervals beyond the ten standard ones, auto-grading of transcription takes
(no pitch detection for grading — takes are self-checked against the reveal),
per-question history (only cumulative attempts/correct per drill and level),
and ear scores in the JSON backup (excluded, same boundary as audio and path
progress). Also skipped in Phase 6:
scales and chords content (the spec marks both "future todo"), community
contributions and AI guidance (spec says later), user-created or edited learning
paths (curated built-ins only), and SVG skill-tree graphs (paths are linear
chains, so the tree renders as an ordered step list).
Also skipped in Phase 5: trimming, multi-track mixing and waveform zoom; live
mic-into-track mixing (the "crossfade"
is a track-side gain slider); URL tracks that do not send CORS headers cannot be
loaded (surfaced as an error); pitch shift is practice-grade (WSOLA stretch plus
playback-rate composition), not studio-grade. Also skipped in Phase 4: full
offline data access (the PWA shell installs and loads from cache, but data
changes need the server running — an IndexedDB/WASM mirror would be a separate
project), File System Access API folder coexistence, and Markdown import of
session logs (import covers templates and exercise packs). The
server-function layer is deliberately kept as a thin validated boundary so a
future auth layer can slot in without restructuring.
