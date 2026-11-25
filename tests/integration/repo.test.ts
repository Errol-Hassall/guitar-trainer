import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Point the app at a throwaway database BEFORE the server modules load.
const tempDir = mkdtempSync(join(tmpdir(), 'guitar-trainer-it-'))
process.env.DATABASE_PATH = join(tempDir, 'test.db')

let db: typeof import('#/server/db').db
let closeDb: typeof import('#/server/db').closeDb
let repo: typeof import('#/server/repo')
let seedDatabase: typeof import('#/server/seed-data').seedDatabase

beforeAll(async () => {
  ;({ db, closeDb } = await import('#/server/db'))
  repo = await import('#/server/repo')
  ;({ seedDatabase } = await import('#/server/seed-data'))
})

beforeEach(() => {
  db.exec('DELETE FROM session_sections')
  db.exec('DELETE FROM sessions')
  db.exec('DELETE FROM template_sections')
  db.exec('DELETE FROM templates')
  db.exec('DELETE FROM presets')
  db.exec("UPDATE app_state SET one_thing_to_fix = ''")
  seedDatabase(db)
})

afterAll(() => {
  closeDb()
  rmSync(tempDir, { recursive: true, force: true })
})

function dailyTemplateId(): number {
  const template = repo.listTemplates().find((value) => value.slug === 'daily-60')
  if (!template) throw new Error('seed data missing')
  return template.id
}

describe('seed data', () => {
  it('seeds the built-in templates with their sections', () => {
    const templates = repo.listTemplates()
    const daily = templates.find((template) => template.slug === 'daily-60')
    const emergency = templates.find((template) => template.slug === 'emergency-20')

    expect(daily?.isBuiltin).toBe(true)
    expect(daily?.sections.map((section) => section.name)).toEqual([
      'Warm-up',
      'Technique',
      'Rhythm',
      'Theory + Ear',
      'Repertoire',
      'Fun / Free play',
    ])
    expect(emergency?.isBuiltin).toBe(true)
    expect(emergency?.sections).toHaveLength(5)
  })

  it('seeds the built-in presets with parsed accents', () => {
    const presets = repo.listPresets()
    const waltz = presets.find((preset) => preset.slug === 'waltz')
    expect(waltz?.isBuiltin).toBe(true)
    expect(waltz?.accents).toEqual([2, 0, 0])
    expect(presets.filter((preset) => preset.isBuiltin)).toHaveLength(3)
  })

  it('is idempotent', () => {
    seedDatabase(db)
    expect(repo.listTemplates().filter((template) => template.isBuiltin)).toHaveLength(2)
    expect(repo.listPresets().filter((preset) => preset.isBuiltin)).toHaveLength(3)
  })
})

describe('templates', () => {
  it('creates a custom template with ordered sections', () => {
    const created = repo.createTemplate({
      name: 'Morning focus',
      sections: [
        { name: 'Warm-up', minutes: 5 },
        { name: 'Technique', minutes: 10 },
      ],
    })

    expect(created.isBuiltin).toBe(false)
    expect(created.sections.map((section) => section.name)).toEqual(['Warm-up', 'Technique'])
    expect(repo.getTemplate(created.id)?.name).toBe('Morning focus')
  })

  it('replaces sections on update', () => {
    const created = repo.createTemplate({
      name: 'Old',
      sections: [{ name: 'A', minutes: 5 }],
    })
    const updated = repo.updateTemplate({
      id: created.id,
      name: 'New',
      sections: [
        { name: 'B', minutes: 10 },
        { name: 'C', minutes: 20 },
      ],
    })

    expect(updated.name).toBe('New')
    expect(updated.sections.map((section) => section.name)).toEqual(['B', 'C'])
  })

  it('refuses to modify or delete built-ins', () => {
    const builtin = repo.listTemplates().find((template) => template.isBuiltin)
    if (!builtin) throw new Error('no builtin')
    expect(() =>
      repo.updateTemplate({ id: builtin.id, name: 'x', sections: [{ name: 'A', minutes: 5 }] }),
    ).toThrow(/Built-in/)
    expect(() => repo.deleteTemplate(builtin.id)).toThrow(/Built-in/)
  })

  it('deletes custom templates', () => {
    const created = repo.createTemplate({
      name: 'Gone soon',
      sections: [{ name: 'A', minutes: 5 }],
    })
    repo.deleteTemplate(created.id)
    expect(repo.getTemplate(created.id)).toBeNull()
  })
})

describe('sessions', () => {
  it('starts a full session with planned seconds per section', () => {
    const id = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'full',
      theme: 'Picking & Pulse',
    })

    const session = repo.getSession(id)
    expect(session?.status).toBe('active')
    expect(session?.autoAdvance).toBe(true)
    // Daily 60: 5, 12, 10, 12, 15, 6 minutes.
    expect(session?.sections.map((section) => section.plannedSeconds)).toEqual([
      300, 720, 600, 720, 900, 360,
    ])
    expect(repo.getActiveSession()?.id).toBe(id)
  })

  it('halves light sessions with a one-minute floor', () => {
    const id = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'light',
      theme: 'Picking & Pulse',
    })
    // 5 min → 150s, 12 → 360s, …, 6 → 180s.
    expect(repo.getSession(id)?.sections.map((section) => section.plannedSeconds)).toEqual([
      150, 360, 300, 360, 450, 180,
    ])
  })

  it('allows only one active session at a time', () => {
    repo.startSession({ templateId: dailyTemplateId(), kind: 'full', theme: 'Picking & Pulse' })
    expect(() =>
      repo.startSession({
        templateId: dailyTemplateId(),
        kind: 'light',
        theme: 'Picking & Pulse',
      }),
    ).toThrow(/active session/)
  })

  it('completes sections, clamps elapsed time and finishes the session on the last one', () => {
    const id = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'full',
      theme: 'Picking & Pulse',
    })
    const [first, ...rest] = repo.getSession(id)?.sections ?? []

    const afterFirst = repo.completeSection(first.id, 99_999)
    expect(afterFirst.sessionCompleted).toBe(false)
    // Elapsed is clamped to the planned 300s.
    expect(repo.getSession(id)?.sections[0].elapsedSeconds).toBe(300)
    expect(repo.getSession(id)?.status).toBe('active')

    for (const section of rest.slice(0, -1)) {
      repo.completeSection(section.id, 10)
    }
    const last = repo.completeSection(rest[rest.length - 1].id, 10)
    expect(last.sessionCompleted).toBe(true)
    expect(repo.getSession(id)?.status).toBe('completed')
  })

  it('does not double-complete a section', () => {
    const id = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'full',
      theme: 'Picking & Pulse',
    })
    const first = repo.getSession(id)?.sections[0]
    if (!first) throw new Error('no section')

    repo.completeSection(first.id, 120)
    expect(() => repo.completeSection(first.id, 300)).not.toThrow()
    expect(repo.getSession(id)?.sections[0].elapsedSeconds).toBe(120)
  })

  it('saves notes and rejects unknown sections', () => {
    const id = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'full',
      theme: 'Picking & Pulse',
    })
    const first = repo.getSession(id)?.sections[0]
    if (!first) throw new Error('no section')

    repo.saveSectionNotes(first.id, 'Clean low E.')
    expect(repo.getSession(id)?.sections[0].notes).toBe('Clean low E.')
    expect(() => repo.saveSectionNotes(99_999, 'x')).toThrow(/not found/i)
  })

  it('persists the auto-advance setting', () => {
    const id = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'full',
      theme: 'Picking & Pulse',
    })
    repo.setAutoAdvance(id, false)
    expect(repo.getSession(id)?.autoAdvance).toBe(false)
    expect(() => repo.setAutoAdvance(99_999, true)).toThrow(/not found/i)
  })

  it('completes a session explicitly and idempotently', () => {
    const id = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'full',
      theme: 'Picking & Pulse',
    })
    repo.completeSession(id)
    expect(repo.getSession(id)?.status).toBe('completed')
    expect(() => repo.completeSession(id)).not.toThrow()
  })

  it('logs a rest day as an already-completed session without sections', () => {
    const id = repo.startRestDay('Light & Reflective')
    const session = repo.getSession(id)
    expect(session?.kind).toBe('rest')
    expect(session?.status).toBe('completed')
    expect(session?.sections).toEqual([])

    // Rest days are blocked while a session is active.
    repo.startSession({ templateId: dailyTemplateId(), kind: 'full', theme: 'Picking & Pulse' })
    expect(() => repo.startRestDay('Light & Reflective')).toThrow(/active session/)
  })

  it('lists sessions newest first with aggregates and a limit', () => {
    const first = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'full',
      theme: 'Picking & Pulse',
    })
    repo.completeSection(repo.getSession(first)?.sections[0].id ?? -1, 300)
    repo.completeSession(first)

    const second = repo.startRestDay('Light & Reflective')

    const all = repo.listSessions(50)
    expect(all.map((summary) => summary.id)).toEqual([second, first])
    expect(all.find((summary) => summary.id === first)?.totalSeconds).toBe(300)
    expect(all.find((summary) => summary.id === first)?.completedSections).toBe(1)

    expect(repo.listSessions(1).map((summary) => summary.id)).toEqual([second])
  })
})

describe('presets', () => {
  it('creates and deletes custom presets, round-tripping accents', () => {
    const created = repo.createPreset({
      name: 'Odd meter',
      bpm: 70,
      beats: 5,
      beatUnit: 4,
      subdivision: 'none',
      accents: [2, 0, 1, 0, 0],
    })
    expect(repo.listPresets().find((preset) => preset.id === created.id)?.accents).toEqual([
      2, 0, 1, 0, 0,
    ])

    repo.deletePreset(created.id)
    expect(repo.listPresets().some((preset) => preset.id === created.id)).toBe(false)
  })

  it('refuses to delete built-in presets', () => {
    const builtin = repo.listPresets().find((preset) => preset.isBuiltin)
    if (!builtin) throw new Error('no builtin')
    expect(() => repo.deletePreset(builtin.id)).toThrow(/Built-in/)
  })
})

describe('one thing', () => {
  it('round-trips the weekly focus note', () => {
    expect(repo.getOneThing()).toBe('')
    repo.setOneThing('Keep time on the last bar.')
    expect(repo.getOneThing()).toBe('Keep time on the last bar.')
    repo.setOneThing('')
    expect(repo.getOneThing()).toBe('')
  })
})
