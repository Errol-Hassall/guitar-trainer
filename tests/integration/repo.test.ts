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
  db.exec('DELETE FROM recordings')
  db.exec('DELETE FROM tracks')
  db.exec('DELETE FROM weekly_reviews')
  db.exec('DELETE FROM exercise_progress')
  db.exec('DELETE FROM exercises')
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

describe('exercises', () => {
  const timedInput = {
    name: 'Picking drill',
    hasTiming: true,
    difficulty: 3,
    tags: ['Technique', 'Key of E'],
    tabText: 'e|---0-2-4-',
  }

  it('creates, lists and updates exercises with tags round-trip', () => {
    const created = repo.createExercise(timedInput)
    expect(created.hasTiming).toBe(true)
    expect(created.tags).toEqual(['Technique', 'Key of E'])

    const listed = repo.listExercises()
    expect(listed.find((exercise) => exercise.id === created.id)?.name).toBe('Picking drill')

    const updated = repo.updateExercise({ ...timedInput, id: created.id, name: 'Renamed' })
    expect(updated.name).toBe('Renamed')
    expect(repo.getExercise(created.id)?.tabText).toBe('e|---0-2-4-')
  })

  it('lists exercises with latest BPM and rating summaries', () => {
    const timed = repo.createExercise(timedInput)
    const untimed = repo.createExercise({ ...timedInput, name: 'Chord shape', hasTiming: false })

    repo.logProgress({ exerciseId: timed.id, maxCleanBpm: 100, durationSeconds: 60 })
    repo.logProgress({ exerciseId: timed.id, maxCleanBpm: 120, durationSeconds: 60 })
    repo.logProgress({ exerciseId: untimed.id, selfRating: 4, durationSeconds: 30 })

    const listed = repo.listExercises()
    expect(listed.find((exercise) => exercise.id === timed.id)?.latestBpm).toBe(120)
    expect(listed.find((exercise) => exercise.id === untimed.id)?.latestRating).toBe(4)
    expect(listed.find((exercise) => exercise.id === untimed.id)?.logCount).toBe(1)
  })

  it('logs timed progress and requires a max clean BPM', () => {
    const id = repo.createExercise(timedInput).id
    expect(() => repo.logProgress({ exerciseId: id })).toThrow(/Max clean BPM/)

    repo.logProgress({
      exerciseId: id,
      maxCleanBpm: 120,
      avgBpm: 95,
      durationSeconds: 300,
      cleanStreak: 4,
    })
    const [row] = repo.listProgress(id)
    expect(row.maxCleanBpm).toBe(120)
    expect(row.avgBpm).toBe(95)
    expect(row.durationSeconds).toBe(300)
    expect(row.cleanStreak).toBe(4)
    expect(row.selfRating).toBeNull()
  })

  it('logs untimed progress and requires a self rating', () => {
    const id = repo.createExercise({ ...timedInput, hasTiming: false }).id
    expect(() => repo.logProgress({ exerciseId: id })).toThrow(/self rating/i)

    repo.logProgress({ exerciseId: id, selfRating: 5, notes: 'Much better.' })
    const [row] = repo.listProgress(id)
    expect(row.selfRating).toBe(5)
    expect(row.notes).toBe('Much better.')
    expect(row.maxCleanBpm).toBeNull()
  })

  it('attaches progress to the active session when one exists', () => {
    const id = repo.createExercise(timedInput).id
    repo.logProgress({ exerciseId: id, maxCleanBpm: 90 })
    expect(repo.listProgress(id)[0].sessionName).toBeNull()

    repo.startSession({ templateId: dailyTemplateId(), kind: 'full', theme: 'Picking & Pulse' })
    repo.logProgress({ exerciseId: id, maxCleanBpm: 100 })
    expect(repo.listProgress(id)[0].sessionName).toBe('Daily 60')
  })

  it('rejects logs for unknown exercises', () => {
    expect(() => repo.logProgress({ exerciseId: 99_999, maxCleanBpm: 100 })).toThrow(
      /not found/i,
    )
  })

  it('deletes exercises and cascades their progress', () => {
    const id = repo.createExercise(timedInput).id
    repo.logProgress({ exerciseId: id, maxCleanBpm: 100 })
    repo.deleteExercise(id)
    expect(repo.getExercise(id)).toBeNull()
    expect(repo.listProgress(id)).toEqual([])
  })
})

describe('workflow (streaks, mood, reviews)', () => {
  const todayKey = new Date().toISOString().slice(0, 10)
  const timedInput = {
    name: 'Picking drill',
    hasTiming: true,
    difficulty: 3,
    tags: ['Technique'],
    tabText: '',
  }

  it('lists session dates in UTC for streak computation', () => {
    expect(repo.listSessionDates()).toEqual([])

    const sessionId = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'full',
      theme: 'Picking & Pulse',
    })
    repo.completeSession(sessionId)
    repo.startRestDay('Light & Reflective')

    expect(repo.listSessionDates()).toEqual([todayKey, todayKey])
  })

  it('sets a mood on completed sessions and exposes it in summaries', () => {
    const sessionId = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'light',
      theme: 'Picking & Pulse',
    })
    expect(repo.getSession(sessionId)?.mood).toBeNull()

    repo.completeSession(sessionId)
    repo.setSessionMood(sessionId, 'energized')
    expect(repo.getSession(sessionId)?.mood).toBe('energized')
    expect(repo.listSessions(10)[0].mood).toBe('energized')

    expect(() => repo.setSessionMood(99_999, 'neutral')).toThrow(/not found/i)
  })

  it('saves one weekly review per week and pushes the focus into the one thing', () => {
    const weekStart = '2026-11-23'
    expect(repo.getWeeklyReview(weekStart)).toBeNull()

    repo.saveWeeklyReview({
      weekStart,
      practicedEveryday: true,
      streakCount: 7,
      improved: 'Cleaner picking.',
      focus: 'Slurs under the click.',
    })
    expect(repo.getOneThing()).toBe('Slurs under the click.')

    const saved = repo.getWeeklyReview(weekStart)
    expect(saved?.practicedEveryday).toBe(true)
    expect(saved?.streakCount).toBe(7)

    // Re-saving the same week updates in place.
    repo.saveWeeklyReview({
      weekStart,
      practicedEveryday: false,
      streakCount: 8,
      improved: '',
      focus: '',
    })
    const updated = repo.getWeeklyReview(weekStart)
    expect(updated?.practicedEveryday).toBe(false)
    expect(repo.listRecentReviews(5)).toHaveLength(1)
    // An empty focus leaves the one thing untouched.
    expect(repo.getOneThing()).toBe('Slurs under the click.')
  })

  it('restores a full backup after data loss', () => {
    const template = repo.createTemplate({
      name: 'Backup drill',
      sections: [{ name: 'Focus', minutes: 10 }],
    })
    const exerciseId = repo.createExercise(timedInput).id
    repo.logProgress({ exerciseId, maxCleanBpm: 110 })
    const sessionId = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'full',
      theme: 'Picking & Pulse',
    })
    repo.completeSession(sessionId)
    repo.setSessionMood(sessionId, 'drained')

    const backup = repo.dumpAll()

    // Simulate data loss.
    db.exec('DELETE FROM exercise_progress')
    db.exec('DELETE FROM exercises')
    db.exec('DELETE FROM session_sections')
    db.exec('DELETE FROM sessions')
    db.exec('DELETE FROM template_sections')
    db.exec('DELETE FROM templates')
    expect(repo.listTemplates().some((t) => t.id === template.id)).toBe(false)

    repo.restoreBackup(backup)

    const restored = repo.listTemplates().find((t) => t.name === 'Backup drill')
    expect(restored?.id).toBe(template.id)
    expect(repo.getExercise(exerciseId)?.name).toBe('Picking drill')
    expect(repo.listProgress(exerciseId)[0].maxCleanBpm).toBe(110)
    const restoredSession = repo.getSession(sessionId)
    expect(restoredSession?.mood).toBe('drained')
    expect(restoredSession?.templateName).toBe('Daily 60')
  })
})

describe('recordings', () => {
  const timedInput = {
    name: 'Picking drill',
    hasTiming: true,
    difficulty: 3,
    tags: ['Technique'],
    tabText: '',
  }

  function makeTaggedRecording(): number {
    const sessionId = repo.startSession({
      templateId: dailyTemplateId(),
      kind: 'full',
      theme: 'Picking & Pulse',
    })
    repo.completeSession(sessionId)
    const exerciseId = repo.createExercise(timedInput).id
    return repo.createRecording({
      name: 'Take 1',
      mime: 'audio/webm',
      data: new Uint8Array([1, 2, 3]),
      durationSeconds: 5,
      sessionId,
      exerciseId,
    }).id
  }

  it('snapshots the session and exercise names at create time', () => {
    const id = makeTaggedRecording()
    const recording = repo.getRecording(id)
    expect(recording?.sessionName).toBe('Daily 60')
    expect(recording?.exerciseName).toBe('Picking drill')
    expect(recording?.durationSeconds).toBe(5)
  })

  it('round-trips the stored bytes', () => {
    const id = makeTaggedRecording()
    const data = repo.getRecordingData(id)
    expect(Array.from(data!.data)).toEqual([1, 2, 3])
    expect(repo.getRecordingData(99_999)).toBeNull()
  })

  it('filters by exercise and deletes', () => {
    const id = makeTaggedRecording()
    const otherExerciseId = repo.createExercise(timedInput).id
    expect(repo.listRecordings(otherExerciseId)).toHaveLength(0)
    expect(repo.listRecordings()).toHaveLength(1)

    repo.deleteRecording(id)
    expect(repo.getRecording(id)).toBeNull()
  })

  it('keeps a single reference take per exercise', () => {
    const first = makeTaggedRecording()
    const second = repo.createRecording({
      name: 'Take 2',
      mime: 'audio/webm',
      data: new Uint8Array([9]),
      durationSeconds: 7,
    }).id

    // A recording with no exercise cannot be a reference.
    expect(() => repo.setReference(second, 1)).toThrow(/not tagged/i)

    const firstExerciseId = repo.getRecording(first)!.exerciseId!
    repo.setReference(first, firstExerciseId)
    expect(repo.getRecording(first)?.isReference).toBe(true)

    // Tag the second take to the same exercise and re-point the reference.
    repo.tagRecordingToExercise(second, firstExerciseId)
    repo.setReference(second, firstExerciseId)
    expect(repo.getRecording(second)?.isReference).toBe(true)
    expect(repo.getRecording(first)?.isReference).toBe(false)

    expect(() => repo.setReference(99_999, firstExerciseId)).toThrow(/not found/i)
  })
})

describe('tracks', () => {
  it('stores and round-trips a file-backed track', () => {
    const id = repo.createTrack({
      name: 'Riff',
      source: 'file',
      data: new Uint8Array([7, 8]),
      mime: 'audio/mpeg',
    }).id
    const data = repo.getTrackData(id)
    expect(Array.from(data!.data)).toEqual([7, 8])
    expect(repo.listTracks().map((track) => track.name)).toContain('Riff')

    repo.deleteTrack(id)
    expect(repo.getTrack(id)).toBeNull()
  })

  it('stores a URL-backed track without bytes', () => {
    const id = repo.createTrack({
      name: 'Demo',
      source: 'url',
      url: 'https://example.com/a.mp3',
    }).id
    const track = repo.getTrack(id)
    expect(track?.source).toBe('url')
    expect(track?.url).toBe('https://example.com/a.mp3')
    expect(repo.getTrackData(id)).toBeNull()
  })
})
