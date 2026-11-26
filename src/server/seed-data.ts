import type { DatabaseSync } from 'node:sqlite'
import type { AccentLevel, ExerciseInput, PresetInput, Theme } from '#/lib/types'

interface SeedTemplate {
  slug: string
  name: string
  sections: { name: string; minutes: number }[]
}

interface SeedPreset extends PresetInput {
  slug: string
}

export const DEFAULT_TEMPLATES: SeedTemplate[] = [
  {
    slug: 'warm-up',
    name: 'Finger Warm-up',
    sections: [
      { name: 'Chromatics', minutes: 2 },
      { name: 'Stretch & Slides', minutes: 2 },
      { name: 'Picking Warm-up', minutes: 2 },
    ],
  },
  {
    slug: 'daily-60',
    name: 'Daily 60',
    sections: [
      { name: 'Warm-up', minutes: 5 },
      { name: 'Technique', minutes: 12 },
      { name: 'Rhythm', minutes: 10 },
      { name: 'Theory + Ear', minutes: 12 },
      { name: 'Repertoire', minutes: 15 },
      { name: 'Fun / Free play', minutes: 6 },
    ],
  },
  {
    slug: 'emergency-20',
    name: 'Emergency 20',
    sections: [
      { name: 'Warm-up', minutes: 3 },
      { name: 'Technique or Rhythm', minutes: 5 },
      { name: 'Theory + Ear', minutes: 5 },
      { name: 'Repertoire with click', minutes: 5 },
      { name: 'Fun', minutes: 2 },
    ],
  },
]

export const DEFAULT_PRESETS: SeedPreset[] = [
  {
    slug: 'two-and-four',
    name: '2 & 4',
    bpm: 90,
    beats: 4,
    beatUnit: 4,
    subdivision: 'none',
    accents: [0, 2, 0, 2] satisfies AccentLevel[],
  },
  {
    slug: 'waltz',
    name: '3/4 Waltz',
    bpm: 120,
    beats: 3,
    beatUnit: 4,
    subdivision: 'none',
    accents: [2, 0, 0] satisfies AccentLevel[],
  },
  {
    slug: 'sixteenths-90',
    name: '16ths at 90',
    bpm: 90,
    beats: 4,
    beatUnit: 4,
    subdivision: 'sixteenth',
    accents: [2, 0, 0, 0] satisfies AccentLevel[],
  },
]

/** Common drills available to every user; read-only (is_builtin). */
export const DEFAULT_EXERCISES: ExerciseInput[] = [
  {
    name: 'Chromatic Warm-up',
    hasTiming: true,
    difficulty: 2,
    tags: ['warm-up'],
    tabText: 'Low E string, one note per click:\nf 1 - 3 - 5 - 8 - 10 - 12',
  },
  {
    name: 'Alternate Picking E-string Drill',
    hasTiming: true,
    difficulty: 3,
    tags: ['picking'],
    tabText: 'Low E string, strict down-up, one note per click:\nf 1 - 5 - 1 (repeat)',
  },
  {
    name: 'Hammer-on / Pull-off Ladder',
    hasTiming: true,
    difficulty: 3,
    tags: ['legato'],
    tabText: '',
  },
  {
    name: 'Slow Legato Slurs',
    hasTiming: false,
    difficulty: 2,
    tags: ['legato'],
    tabText: '',
  },
  {
    name: 'Rhythm Clapping: 8ths & Triplets',
    hasTiming: false,
    difficulty: 1,
    tags: ['rhythm'],
    tabText: '',
  },
  {
    name: 'Transcription: Simple Melody',
    hasTiming: false,
    difficulty: 4,
    tags: ['ear-training'],
    tabText: '',
  },
]

interface SeedStep {
  title: string
  description: string
  externalUrl?: string
  exerciseName?: string
}

interface SeedPath {
  slug: string
  name: string
  description: string
  theme: Theme
  steps: SeedStep[]
}

/** Curated paths mirroring the weekly rotation themes; steps chain as prerequisites. */
export const DEFAULT_PATHS: SeedPath[] = [
  {
    slug: 'clean-foundations',
    name: 'Clean Foundations',
    description: 'Slow, deliberate habits that every other path builds on.',
    theme: 'Light & Reflective',
    steps: [
      {
        title: 'Slow Practice Habits',
        description:
          'Play one phrase at half tempo until it is effortless. No rushing, no fixing mid-run.',
        externalUrl:
          'https://www.youtube.com/results?search_query=slow+practice+guitar+metronome',
      },
      {
        title: 'Metronome Discipline',
        description:
          'Start every drill at a tempo where ten reps are clean, then raise by 2-4 BPM.',
        exerciseName: 'Chromatic Warm-up',
      },
      {
        title: 'Clean Repetition',
        description:
          'Stop at the first mistake, replay that spot, then continue. Log your streaks in Exercises.',
      },
    ],
  },
  {
    slug: 'alternate-picking',
    name: 'Alternate Picking 101 → 301',
    description: 'Down-up picking from first principles to speed.',
    theme: 'Picking & Pulse',
    steps: [
      {
        title: 'Alternate Picking 101',
        description:
          'Strict down-up on the low E string, one note per click at a slow tempo.',
        externalUrl:
          'https://www.youtube.com/results?search_query=alternate+picking+101+guitar',
        exerciseName: 'Alternate Picking E-string Drill',
      },
      {
        title: 'Alternate Picking 201',
        description:
          'Add two-notes-per-click patterns and keep the strokes even as the tempo rises.',
        externalUrl:
          'https://www.youtube.com/results?search_query=alternate+picking+patterns+guitar',
      },
      {
        title: 'Alternate Picking 301',
        description:
          'Apply down-up to 16th-note runs across strings; record a reference take and compare weekly.',
      },
    ],
  },
  {
    slug: 'legato-groove',
    name: 'Legato & Groove',
    description: 'Hammer-ons, pull-offs and rhythm feel with the click.',
    theme: 'Legato & Groove',
    steps: [
      {
        title: 'Hammer-ons & Pull-offs',
        description:
          'Chromatic hammer-on ladder, clean on and off, at a tempo where every note rings.',
        exerciseName: 'Hammer-on / Pull-off Ladder',
      },
      {
        title: 'Slurs Under the Click',
        description:
          'Pair slurs with the metronome so only the struck notes land on the beat.',
        exerciseName: 'Slow Legato Slurs',
      },
      {
        title: 'Rhythm Grooves',
        description:
          'Clap and strum 8th-note and triplet patterns until they feel like one gesture.',
        exerciseName: 'Rhythm Clapping: 8ths & Triplets',
      },
    ],
  },
  {
    slug: 'accuracy-transcription',
    name: 'Accuracy & Transcription',
    description: 'Train the ear first, then prove it on the fretboard.',
    theme: 'Accuracy & Transcription',
    steps: [
      {
        title: 'Ear Training Basics',
        description:
          'Identify intervals and single notes by ear before touching the guitar.',
        externalUrl:
          'https://www.youtube.com/results?search_query=ear+training+guitar+beginner',
      },
      {
        title: 'Single-Note Transcription',
        description:
          'Transcribe one short melody a day, then check against the tab afterwards.',
        exerciseName: 'Transcription: Simple Melody',
      },
      {
        title: 'Full-Phrase Transcription',
        description:
          'Work up to four-bar phrases with rhythm, then play them at tempo with the click.',
      },
    ],
  },
]

export function seedDatabase(db: DatabaseSync): void {
  const now = new Date().toISOString()
  db.exec('BEGIN IMMEDIATE')
  try {
    const findTemplate = db.prepare('SELECT id FROM templates WHERE slug = ?')
    const insertTemplate = db.prepare(
      `INSERT INTO templates (slug, name, is_builtin, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?)`,
    )
    const insertTemplateSection = db.prepare(
      `INSERT INTO template_sections (template_id, position, name, minutes)
       VALUES (?, ?, ?, ?)`,
    )

    for (const template of DEFAULT_TEMPLATES) {
      if (findTemplate.get(template.slug)) continue
      const result = insertTemplate.run(
        template.slug,
        template.name,
        now,
        now,
      )
      const templateId = Number(result.lastInsertRowid)
      template.sections.forEach((section, position) => {
        insertTemplateSection.run(
          templateId,
          position,
          section.name,
          section.minutes,
        )
      })
    }

    const findPreset = db.prepare('SELECT id FROM presets WHERE slug = ?')
    const insertPreset = db.prepare(
      `INSERT INTO presets
        (slug, name, is_builtin, bpm, beats, beat_unit, subdivision, accents, created_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)`,
    )
    for (const preset of DEFAULT_PRESETS) {
      if (findPreset.get(preset.slug)) continue
      insertPreset.run(
        preset.slug,
        preset.name,
        preset.bpm,
        preset.beats,
        preset.beatUnit,
        preset.subdivision,
        JSON.stringify(preset.accents),
        now,
      )
    }

    const findExercise = db.prepare('SELECT id FROM exercises WHERE name = ?')
    const insertExercise = db.prepare(
      `INSERT INTO exercises
        (name, has_timing, difficulty, tags, tab_text, is_builtin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    for (const exercise of DEFAULT_EXERCISES) {
      if (findExercise.get(exercise.name)) continue
      insertExercise.run(
        exercise.name,
        exercise.hasTiming ? 1 : 0,
        exercise.difficulty,
        JSON.stringify(exercise.tags),
        exercise.tabText,
        now,
        now,
      )
    }

    const findPath = db.prepare('SELECT id FROM learning_paths WHERE slug = ?')
    const insertPath = db.prepare(
      `INSERT INTO learning_paths (slug, name, description, theme, position, is_builtin, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
    )
    const insertStep = db.prepare(
      `INSERT INTO path_steps (path_id, position, title, description, external_url, exercise_id, requires_step_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    DEFAULT_PATHS.forEach((path, index) => {
      if (findPath.get(path.slug)) return
      const result = insertPath.run(
        path.slug,
        path.name,
        path.description,
        path.theme,
        index,
        now,
      )
      const pathId = Number(result.lastInsertRowid)
      let previousStepId: number | null = null
      path.steps.forEach((step, stepIndex) => {
        const exerciseRow = step.exerciseName
          ? (findExercise.get(step.exerciseName) as { id: number } | undefined)
          : undefined
        const stepResult = insertStep.run(
          pathId,
          stepIndex + 1,
          step.title,
          step.description,
          step.externalUrl ?? null,
          exerciseRow?.id ?? null,
          previousStepId,
        )
        previousStepId = Number(stepResult.lastInsertRowid)
      })
    })

    db.prepare(
      `INSERT OR IGNORE INTO app_state (id, one_thing_to_fix, updated_at)
       VALUES (1, '', ?)`,
    ).run(now)

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
