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

Status: 1–9 ✅ built · 11 skipped (user decision) · 18–20 excluded by design · rest pending.

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
10. **LickLab** — generated short playable phrases (call-and-response style) in a chosen
    key, randomisable by style (blues / jazz), annotated with technique (slide into the
    note, vibrato, finger order 1-3-2-4). Generation validates against playability rules
    and retries; it is AI-assisted ("create with AI"). → We have nothing like generated
    playable content; our learning-path steps link out to YouTube instead.
11. **YouTube integration** — paste a YouTube URL or video ID to bring a song into the
    practice flow. → Our backing tracks load from file or http(s) URL, but direct
    YouTube audio is CORS-blocked in-browser, so this would need an explicit decision
    (embed-player side-by-side vs server-side fetch).
12. **Warm-up content** — a "finger warm-up before practice" entry point as first-class
    content. → Our templates can model this, but there is no dedicated warm-up flow.

## Paths & games

13. **Genre-specific paths** *(partial)* — a blues path and a genres overview page
    ("scales of this genre"). → We have four technique-themed paths (clean foundations,
    alternate picking, legato/groove, accuracy/transcription); none is genre-organised.
14. **Gamified drill structure** *(partial)* — drills as levels with best-score-per-level,
    consecutive-correct streaks and average time per question. → Our four ear drills keep
    cumulative attempts/correct per drill+level only; no levels, best scores or timing.
15. **Theory-knowledge questions + interval notebook** *(partial)* — games include
    non-ear questions (note naming, "which chords live in this key") and a personal
    "interval notebook" of learned intervals with audio. → Our ear drills cover the
    listening side well; theory quiz content and a personal interval collection are missing.

## Tools & meta

16. **Practice-log trends** *(partial)* — a dedicated log page: practice-day count,
    time spent rendered as hours/minutes, weekly view, "see your real trend". → We have
    session history with totals and per-exercise BPM graphs, but no chart of practice
    *volume* over time.
17. **Light/dark theme toggle** — persisted user choice, default dark, pre-paint script
    to avoid flash. → We are dark-only (`color-scheme: dark`).
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
