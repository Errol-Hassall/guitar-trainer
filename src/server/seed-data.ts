import type { DatabaseSync } from 'node:sqlite'
import type { AccentLevel, PresetInput } from '#/lib/types'

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
