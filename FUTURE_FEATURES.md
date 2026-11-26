# Future features — gaps vs hoksai.online

Reference document of features on [hoksai.online](https://hoksai.online/) ("HokSai — ห้องซ้อมกีตาร์",
a Thai-language, free, no-signup guitar practice web app) that this app does not have.
Compiled 2026-11-25 from the site's manifest and JS bundle (page map:
home · **practice**: metronome / backing / trainer / ear · **theory**: chords / scales /
arpeggios / keys / circle / modes · **paths**: blues / genres / licklab / games ·
**tools**: youtube / log / feedback / account).

Each entry: what they do → our nearest neighbour today. Items marked *(partial)* overlap
with something we already build; the rest are missing outright. Entries prefixed ✅ are
built (see README Features).

Status: 1–10, 12–17 ✅ built · 11 skipped (user decision) · 18–20 excluded by design. All buildable items done.

## Theory library — the biggest gap

We skipped chords and scales content in Phase 6 (spec marked both "future todo").
HokSai has a whole six-page theory section:

1. ✅ **Chord library** — searchable chord database with fretboard diagrams (fret range,
   barre vs open classification), "which chords live in this key" lookup, 7th-chord
   colour guide ("colour of dominant 7 — makes the sound want to move on"), I–IV–V
   triads, a how-to-read-diagrams explainer, PNG export and copy-as-text per diagram.
   → We have nothing; exercises can carry freeform tabs text but no structured chords.
2. ✅ **Scale library** — every scale type (major, pentatonic, blues, bebop dominant,
   modes) in all 12 keys rendered across the whole neck, box positions, and a practice
   mode with per-string 3-note patterns plus an adjustable "fret window" / difficulty.
   → Built: six types × 12 keys on the whole neck with a fret-window playback practice
   mode. Modes ship as item 6; "boxes" are covered by the whole-neck view + window.
3. ✅ **Arpeggios page** — chord tones of the 20 common chords on the fretboard with
   fret-window playback (triad/seventh voicings come from the diagram data).
4. ✅ **Keys page** — major + minor signatures (minor via relative major) and the seven
   diatonic triads per key with Roman numerals.
5. ✅ **Circle of fifths** — interactive ring, tap a segment for signature + relative minor + triads.
6. ✅ **Modes page** — seven modes with colour/character/genre, spelling per root, parent major,
   fretboard playback.

The shared fretboard component underpins 1–3; keys, circle and modes are data + rendering on
top of `theory.ts`.

## Practice

7. ✅ **Global persistent metronome** — state lifted to a root provider; the click keeps
   running through navigation and the nav bar shows a live "N BPM" indicator linking back.
8. ✅ **Metronome extras** — stop-after-N-bars auto-stop (single bar count; count-in
   doesn't count) and named patterns: waltz (strong-weak-weak), shuffle (long–short, the
   swing subdivision), gallop (short–long), rest beats as a fourth accent level that
   counts but doesn't play.
9. ✅ **Rhythm-accuracy trainer** — `/trainer` scores taps against the shared metronome:
   per-hit offset ("late by N ms"), % on beat (10%-of-beat window, ±50 ms cap), average
   bias, consistency (σ) and adaptive advice; runs persist in `rhythm_stats`.
10. ✅ **LickLab** — `/licklab` generates 8-note phrases from the scale data: key, scale
    and style (blues / jazz) pick the pool and step size; a seed makes every lick
    reproducible. Notes carry technique annotations (slide / vibrato / hammer-on), are
    validated to stay inside one five-fret position (with retry), play back over Web Audio
    and copy as plain text. Deterministic local generation — no LLM, per the exclusion.
11. **YouTube integration** — paste a YouTube URL or video ID to bring a song into the
    practice flow. → Our backing tracks load from file or http(s) URL, but direct
    YouTube audio is CORS-blocked in-browser, so this would need an explicit decision
    (embed-player side-by-side vs server-side fetch).
12. ✅ **Warm-up content** — built-in *Finger Warm-up* template (chromatics, stretch &
    slides, picking — 6 min) with a one-tap quick start on home; existing installs pick it
    up on the next seed pass.

## Paths & games

13. ✅ **Genre-specific paths** — seeded *Blues Path* (pentatonic box → blue notes →
    12-bar changes → phrasing, theme "Expression & Progressions") and a static `/genres`
    page: curated scales per genre plus the modes tagged for it (derived from MODES).
14. ✅ **Gamified drill structure** — each scored drill keeps accuracy plus a best
    in-round streak of consecutive correct answers and the average time per answer
    (question shown → tap), all shown on the ear-training list; chord quality already
    runs two levels.
15. ✅ **Theory-knowledge questions + interval notebook** — a text-only *Theory quiz*
    drill (fretboard note names, major-key signatures, interval sizes) scored like the
    audio drills, plus `/intervals`: the ten standard intervals with audio and a personal
    note per interval (add/edit/remove).

## Tools & meta

16. ✅ **Practice-log trends** — the history page now leads with a practice-volume
    chart: minutes per day over the last 14 days (dependency-free SVG), built from the
    session totals already in the DB.
17. ✅ **Light/dark theme toggle** — header toggle with a light palette (token
    overrides on `data-theme="light"`), default dark, persisted in localStorage and
    restored by a pre-paint script so there is no flash of the wrong theme.
18. **Feedback submission** — "send a suggestion" form that POSTs to the author
    (with failure status shown). → Nothing; arguably fine for a self-hosted app.
19. **Optional account / sign-up** — the app is usable without an account, but an
    account page with registration exists (cross-device persistence). → Deliberate
    philosophical difference: we are single-user, self-hosted, no auth by design.
    Only revisit if multi-device sync is ever wanted.
20. **AI-generated advice/content** — "create with AI" for phrases and guideline
    suggestions. → Deliberately rule-based in Phase 8 (no API key, no network); the
    LickLab-style use case (item 10) is where an optional LLM would fit best.

## What we have that they don't (for balance)

Guided sessions with templates/sections and history · recordings with A/B compare and
reference takes · WSOLA time-stretch backing tracks with loop points and speed ramps ·
the weekly-review / one-thing-to-fix workflow · mood logging · full data export/import/
backup · hands-free foot-pedal keys + voice control · spaced-repetition "due for review"
· monthly milestone check.

## Where to start (opinion, not a plan)

- **Chord + scale library** (items 1–2) — the largest visible gap and the one users of
  any practice app expect; one shared fretboard-diagram component serves both.
- **Rhythm-accuracy trainer** (item 9) — small surface (a page + a scoring loop over the
  existing metronome scheduler), high daily-practice value, no new data beyond stats rows.
- **Global metronome + stop-after-bars** (items 7–8) — cheap wins that change how the
  app feels during practice.
- **LickLab** (item 10) — the most ambitious; do it only after the theory library, since
  generated licks need scales/chords as their rule base.
