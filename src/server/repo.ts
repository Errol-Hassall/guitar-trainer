import { db } from './db'
import { seedDatabase } from './seed-data'
import type {
  AppExport,
  BackingTrack,
  Exercise,
  ExerciseInput,
  ExerciseProgress,
  ExerciseSummary,
  LearningPathDetail,
  LearningPathSummary,
  LogProgressInput,
  MetronomePreset,
  Mood,
  PracticeSession,
  PresetInput,
  RecordingInput,
  RecordingSummary,
  SessionSection,
  SessionStatus,
  SessionSummary,
  StartSessionInput,
  Template,
  TemplateInput,
  Theme,
  TrackInput,
  UpdateExerciseInput,
  UpdateTemplateInput,
  WeeklyReview,
} from '#/lib/types'
import { parseExercisesFromMarkdown, parseTemplatesFromMarkdown } from '#/lib/export'
import { isStepUnlocked } from '#/lib/learning'
import { defaultAccents, resizeAccents } from '#/lib/metronome'
import { plannedSeconds } from '#/lib/sessions'

interface TemplateRow {
  id: number
  slug: string | null
  name: string
  is_builtin: number
  created_at: string
  updated_at: string
}

interface TemplateSectionRow {
  id: number
  template_id: number
  position: number
  name: string
  minutes: number
}

interface SessionRow {
  id: number
  template_id: number | null
  template_name: string
  theme: Theme
  kind: 'full' | 'light' | 'rest'
  auto_advance: number
  status: SessionStatus
  started_at: string
  completed_at: string | null
  mood: Mood | null
}

interface SessionSectionRow {
  id: number
  session_id: number
  position: number
  name: string
  planned_seconds: number
  elapsed_seconds: number
  notes: string
  completed_at: string | null
}

interface PresetRow {
  id: number
  slug: string | null
  name: string
  is_builtin: number
  bpm: number
  beats: number
  beat_unit: number
  subdivision: MetronomePreset['subdivision']
  accents: string
  created_at: string
}

interface ExerciseRow {
  id: number
  name: string
  has_timing: number
  difficulty: number
  tags: string
  tab_text: string
  is_builtin: number
  created_at: string
  updated_at: string
}

interface LearningPathRow {
  id: number
  slug: string | null
  name: string
  description: string
  theme: Theme
  position: number
  is_builtin: number
  created_at: string
}

interface PathStepRow {
  id: number
  path_id: number
  position: number
  title: string
  description: string
  external_url: string | null
  exercise_id: number | null
  requires_step_id: number | null
}

interface ProgressRow {
  id: number
  exercise_id: number
  session_id: number | null
  session_name: string | null
  max_clean_bpm: number | null
  avg_bpm: number | null
  duration_seconds: number
  clean_streak: number | null
  self_rating: number | null
  notes: string
  completed_at: string
}

function parseTags(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    hasTiming: row.has_timing === 1,
    difficulty: row.difficulty,
    tags: parseTags(row.tags),
    tabText: row.tab_text,
    isBuiltin: row.is_builtin === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapProgress(row: ProgressRow): ExerciseProgress {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    sessionName: row.session_name,
    maxCleanBpm: row.max_clean_bpm,
    avgBpm: row.avg_bpm,
    durationSeconds: row.duration_seconds,
    cleanStreak: row.clean_streak,
    selfRating: row.self_rating,
    notes: row.notes,
    completedAt: row.completed_at,
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function transaction<T>(work: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function assertBuiltinGuard(isBuiltin: number, noun: string): void {
  if (isBuiltin === 1) {
    throw new Error(`Built-in ${noun}s cannot be modified. Make a copy first.`)
  }
}

function mapTemplate(row: TemplateRow, sections: TemplateSectionRow[]): Template {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isBuiltin: row.is_builtin === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sections: sections.map((section) => ({
      id: section.id,
      position: section.position,
      name: section.name,
      minutes: section.minutes,
    })),
  }
}

function mapSection(row: SessionSectionRow): SessionSection {
  return {
    id: row.id,
    position: row.position,
    name: row.name,
    plannedSeconds: row.planned_seconds,
    elapsedSeconds: row.elapsed_seconds,
    notes: row.notes,
    completedAt: row.completed_at,
  }
}

function mapSession(row: SessionRow, sections: SessionSectionRow[]): PracticeSession {
  return {
    id: row.id,
    templateId: row.template_id,
    templateName: row.template_name,
    theme: row.theme,
    kind: row.kind,
    autoAdvance: row.auto_advance === 1,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    mood: row.mood,
    sections: sections.map(mapSection),
  }
}

function parseAccents(json: string, beats: number): MetronomePreset['accents'] {
  try {
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return defaultAccents(beats)
    return resizeAccents(
      parsed.filter((value): value is 0 | 1 | 2 => value === 0 || value === 1 || value === 2),
      beats,
    )
  } catch {
    return defaultAccents(beats)
  }
}

function mapPreset(row: PresetRow): MetronomePreset {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isBuiltin: row.is_builtin === 1,
    bpm: row.bpm,
    beats: row.beats,
    beatUnit: row.beat_unit as MetronomePreset['beatUnit'],
    subdivision: row.subdivision,
    accents: parseAccents(row.accents, row.beats),
  }
}

function getTemplateRow(id: number): TemplateRow {
  const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as
    | TemplateRow
    | undefined
  if (!row) throw new Error('Template not found.')
  return row
}

function listSectionsForTemplate(templateId: number): TemplateSectionRow[] {
  return (
    db
      .prepare(
        `SELECT * FROM template_sections
         WHERE template_id = ? ORDER BY position`,
      )
      .all(templateId) as unknown as TemplateSectionRow[]
  )
}

function listSectionsForSession(sessionId: number): SessionSectionRow[] {
  return (
    db
      .prepare(
        `SELECT * FROM session_sections
         WHERE session_id = ? ORDER BY position`,
      )
      .all(sessionId) as unknown as SessionSectionRow[]
  )
}

export function listTemplates(): Template[] {
  const rows = (
    db
      .prepare('SELECT * FROM templates ORDER BY is_builtin DESC, name')
      .all() as unknown as TemplateRow[]
  ).map((row) => mapTemplate(row, listSectionsForTemplate(row.id)))
  return rows
}

export function getTemplate(id: number): Template | null {
  const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as
    | TemplateRow
    | undefined
  if (!row) return null
  return mapTemplate(row, listSectionsForTemplate(row.id))
}

export function createTemplate(input: TemplateInput): Template {
  const id = transaction(() => {
    const now = nowIso()
    const result = db
      .prepare(
        `INSERT INTO templates (slug, name, is_builtin, created_at, updated_at)
         VALUES (NULL, ?, 0, ?, ?)`,
      )
      .run(input.name, now, now)
    const templateId = Number(result.lastInsertRowid)
    const insert = db.prepare(
      `INSERT INTO template_sections (template_id, position, name, minutes)
       VALUES (?, ?, ?, ?)`,
    )
    input.sections.forEach((section, position) => {
      insert.run(templateId, position, section.name, section.minutes)
    })
    return templateId
  })
  return getTemplate(id) as Template
}

export function updateTemplate(input: UpdateTemplateInput): Template {
  const existing = getTemplateRow(input.id)
  assertBuiltinGuard(existing.is_builtin, 'template')

  transaction(() => {
    db.prepare('UPDATE templates SET name = ?, updated_at = ? WHERE id = ?').run(
      input.name,
      nowIso(),
      input.id,
    )
    db.prepare('DELETE FROM template_sections WHERE template_id = ?').run(input.id)
    const insert = db.prepare(
      `INSERT INTO template_sections (template_id, position, name, minutes)
       VALUES (?, ?, ?, ?)`,
    )
    input.sections.forEach((section, position) => {
      insert.run(input.id, position, section.name, section.minutes)
    })
  })

  return getTemplate(input.id) as Template
}

export function deleteTemplate(id: number): void {
  const existing = getTemplateRow(id)
  assertBuiltinGuard(existing.is_builtin, 'template')
  db.prepare('DELETE FROM templates WHERE id = ?').run(id)
}

function findActiveSessionId(): number | null {
  const row = db
    .prepare("SELECT id FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1")
    .get() as { id: number } | undefined
  return row?.id ?? null
}

export function startSession(input: StartSessionInput): number {
  const template = getTemplate(input.templateId)
  if (!template) throw new Error('Template not found.')

  return transaction(() => {
    if (findActiveSessionId() !== null) {
      throw new Error('Finish or end the active session before starting a new one.')
    }
    const now = nowIso()
    const result = db
      .prepare(
        `INSERT INTO sessions
          (template_id, template_name, theme, kind, auto_advance, status, started_at, completed_at)
         VALUES (?, ?, ?, ?, 1, 'active', ?, NULL)`,
      )
      .run(template.id, template.name, input.theme, input.kind, now)
    const sessionId = Number(result.lastInsertRowid)

    const insert = db.prepare(
      `INSERT INTO session_sections
        (session_id, position, name, planned_seconds, elapsed_seconds, notes, completed_at)
       VALUES (?, ?, ?, ?, 0, '', NULL)`,
    )
    template.sections.forEach((section, position) => {
      insert.run(
        sessionId,
        position,
        section.name,
        plannedSeconds(section.minutes, input.kind),
      )
    })
    return sessionId
  })
}

export function startRestDay(theme: Theme): number {
  return transaction(() => {
    if (findActiveSessionId() !== null) {
      throw new Error('Finish or end the active session before logging a rest day.')
    }
    const now = nowIso()
    const result = db
      .prepare(
        `INSERT INTO sessions
          (template_id, template_name, theme, kind, auto_advance, status, started_at, completed_at)
         VALUES (NULL, 'Rest day', ?, 'rest', 0, 'completed', ?, ?)`,
      )
      .run(theme, now, now)
    return Number(result.lastInsertRowid)
  })
}

export function getSession(id: number): PracticeSession | null {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as
    | SessionRow
    | undefined
  if (!row) return null
  return mapSession(row, listSectionsForSession(row.id))
}

export function getActiveSession(): PracticeSession | null {
  const row = db
    .prepare(
      "SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1",
    )
    .get() as SessionRow | undefined
  if (!row) return null
  return mapSession(row, listSectionsForSession(row.id))
}

export function listSessions(limit: number): SessionSummary[] {
  const rows = db
    .prepare(
      `SELECT s.id, s.template_name, s.theme, s.kind, s.status, s.started_at, s.completed_at, s.mood,
              COUNT(ss.id) AS section_count,
              COALESCE(SUM(CASE WHEN ss.completed_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS completed_sections,
              COALESCE(SUM(ss.elapsed_seconds), 0) AS total_seconds
       FROM sessions s
       LEFT JOIN session_sections ss ON ss.session_id = s.id
       GROUP BY s.id
       ORDER BY s.started_at DESC, s.id DESC
       LIMIT ?`,
    )
    .all(limit) as unknown as (SessionRow & {
      section_count: number
      completed_sections: number
      total_seconds: number
    })[]

  return rows.map((row) => ({
    id: row.id,
    templateName: row.template_name,
    theme: row.theme,
    kind: row.kind,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    sectionCount: row.section_count,
    completedSections: row.completed_sections,
    totalSeconds: row.total_seconds,
    mood: row.mood,
  }))
}

export function completeSection(
  sectionId: number,
  elapsedSeconds: number,
): { sessionId: number; sessionCompleted: boolean } {
  return transaction(() => {
    const row = db
      .prepare('SELECT * FROM session_sections WHERE id = ?')
      .get(sectionId) as SessionSectionRow | undefined
    if (!row) throw new Error('Section not found.')

    if (row.completed_at === null) {
      const elapsed = Math.min(Math.max(0, elapsedSeconds), row.planned_seconds)
      db.prepare(
        'UPDATE session_sections SET elapsed_seconds = ?, completed_at = ? WHERE id = ?',
      ).run(elapsed, nowIso(), sectionId)
    }

    const remaining = db
      .prepare(
        'SELECT COUNT(*) AS count FROM session_sections WHERE session_id = ? AND completed_at IS NULL',
      )
      .get(row.session_id) as { count: number }

    let sessionCompleted = false
    if (remaining.count === 0) {
      const updated = db
        .prepare(
          `UPDATE sessions SET status = 'completed', completed_at = ?
           WHERE id = ? AND status = 'active'`,
        )
        .run(nowIso(), row.session_id)
      sessionCompleted = Number(updated.changes) > 0
    }

    return { sessionId: row.session_id, sessionCompleted }
  })
}

export function saveSectionNotes(sectionId: number, notes: string): void {
  const updated = db
    .prepare('UPDATE session_sections SET notes = ? WHERE id = ?')
    .run(notes, sectionId)
  if (Number(updated.changes) === 0) throw new Error('Section not found.')
}

export function setAutoAdvance(sessionId: number, autoAdvance: boolean): void {
  const updated = db
    .prepare('UPDATE sessions SET auto_advance = ? WHERE id = ?')
    .run(autoAdvance ? 1 : 0, sessionId)
  if (Number(updated.changes) === 0) throw new Error('Session not found.')
}

export function completeSession(sessionId: number): void {
  const row = db
    .prepare('SELECT id, status FROM sessions WHERE id = ?')
    .get(sessionId) as { id: number; status: SessionStatus } | undefined
  if (!row) throw new Error('Session not found.')
  if (row.status === 'completed') return

  db.prepare(
    `UPDATE sessions SET status = 'completed', completed_at = ? WHERE id = ?`,
  ).run(nowIso(), sessionId)
}

export function getOneThing(): string {
  const row = db
    .prepare('SELECT one_thing_to_fix FROM app_state WHERE id = 1')
    .get() as { one_thing_to_fix: string } | undefined
  return row?.one_thing_to_fix ?? ''
}

export function setOneThing(text: string): void {
  const updated = db
    .prepare('UPDATE app_state SET one_thing_to_fix = ?, updated_at = ? WHERE id = 1')
    .run(text, nowIso())
  if (Number(updated.changes) === 0) {
    db.prepare(
      'INSERT INTO app_state (id, one_thing_to_fix, updated_at) VALUES (1, ?, ?)',
    ).run(text, nowIso())
  }
}

export function listPresets(): MetronomePreset[] {
  const rows = db
    .prepare('SELECT * FROM presets ORDER BY is_builtin DESC, name')
    .all() as unknown as PresetRow[]
  return rows.map(mapPreset)
}

export function createPreset(input: PresetInput): MetronomePreset {
  const now = nowIso()
  const result = db
    .prepare(
      `INSERT INTO presets
        (slug, name, is_builtin, bpm, beats, beat_unit, subdivision, accents, created_at)
       VALUES (NULL, ?, 0, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name,
      input.bpm,
      input.beats,
      input.beatUnit,
      input.subdivision,
      JSON.stringify(input.accents),
      now,
    )
  const row = db
    .prepare('SELECT * FROM presets WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as unknown as PresetRow
  return mapPreset(row)
}

export function deletePreset(id: number): void {
  const row = db.prepare('SELECT is_builtin FROM presets WHERE id = ?').get(
    id,
  ) as { is_builtin: number } | undefined
  if (!row) throw new Error('Preset not found.')
  assertBuiltinGuard(row.is_builtin, 'preset')
  db.prepare('DELETE FROM presets WHERE id = ?').run(id)
}

function getExerciseRow(id: number): ExerciseRow {
  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(
    id,
  ) as ExerciseRow | undefined
  if (!row) throw new Error('Exercise not found.')
  return row
}

export function listExercises(): ExerciseSummary[] {
  const rows = db
    .prepare(
      `SELECT e.*,
              (SELECT COUNT(*) FROM exercise_progress p WHERE p.exercise_id = e.id) AS log_count,
              (SELECT p.max_clean_bpm FROM exercise_progress p
                WHERE p.exercise_id = e.id AND p.max_clean_bpm IS NOT NULL
                ORDER BY p.completed_at DESC, p.id DESC LIMIT 1) AS latest_bpm,
              (SELECT p.self_rating FROM exercise_progress p
                WHERE p.exercise_id = e.id AND p.self_rating IS NOT NULL
                ORDER BY p.completed_at DESC, p.id DESC LIMIT 1) AS latest_rating
       FROM exercises e
       ORDER BY is_builtin DESC, name`,
    )
    .all() as unknown as (ExerciseRow & {
    log_count: number
    latest_bpm: number | null
    latest_rating: number | null
  })[]

  return rows.map((row) => ({
    ...mapExercise(row),
    logCount: row.log_count,
    latestBpm: row.latest_bpm,
    latestRating: row.latest_rating,
  }))
}

export function getExercise(id: number): Exercise | null {
  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(
    id,
  ) as ExerciseRow | undefined
  if (!row) return null
  return mapExercise(row)
}

export function createExercise(input: ExerciseInput): Exercise {
  const now = nowIso()
  const result = db
    .prepare(
      `INSERT INTO exercises (name, has_timing, difficulty, tags, tab_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name,
      input.hasTiming ? 1 : 0,
      input.difficulty,
      JSON.stringify(input.tags),
      input.tabText,
      now,
      now,
    )
  return getExercise(Number(result.lastInsertRowid)) as Exercise
}

export function updateExercise(input: UpdateExerciseInput): Exercise {
  assertBuiltinGuard(getExerciseRow(input.id).is_builtin, 'exercise')
  db.prepare(
    `UPDATE exercises SET name = ?, has_timing = ?, difficulty = ?, tags = ?, tab_text = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    input.name,
    input.hasTiming ? 1 : 0,
    input.difficulty,
    JSON.stringify(input.tags),
    input.tabText,
    nowIso(),
    input.id,
  )
  return getExercise(input.id) as Exercise
}

export function deleteExercise(id: number): void {
  assertBuiltinGuard(getExerciseRow(id).is_builtin, 'exercise')
  db.prepare('DELETE FROM exercises WHERE id = ?').run(id)
}

export function listProgress(exerciseId: number): ExerciseProgress[] {
  const rows = db
    .prepare(
      `SELECT p.*, s.template_name AS session_name
       FROM exercise_progress p
       LEFT JOIN sessions s ON s.id = p.session_id
       WHERE p.exercise_id = ?
       ORDER BY p.completed_at DESC, p.id DESC`,
    )
    .all(exerciseId) as unknown as ProgressRow[]
  return rows.map(mapProgress)
}

export function logProgress(input: LogProgressInput): void {
  const exercise = getExerciseRow(input.exerciseId)
  if (exercise.has_timing === 1 && input.maxCleanBpm === undefined) {
    throw new Error('Max clean BPM is required for timed exercises.')
  }
  if (exercise.has_timing === 0 && input.selfRating === undefined) {
    throw new Error('A self rating is required for untimed exercises.')
  }

  const timed = exercise.has_timing === 1
  db.prepare(
    `INSERT INTO exercise_progress
      (exercise_id, session_id, max_clean_bpm, avg_bpm, duration_seconds, clean_streak, self_rating, notes, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.exerciseId,
    findActiveSessionId(),
    timed ? input.maxCleanBpm ?? null : null,
    timed ? input.avgBpm ?? null : null,
    input.durationSeconds ?? 0,
    timed ? input.cleanStreak ?? null : null,
    timed ? null : input.selfRating ?? null,
    input.notes ?? '',
    nowIso(),
  )
}

export function importTemplates(markdown: string): number {
  const parsed = parseTemplatesFromMarkdown(markdown)
  let created = 0
  for (const template of parsed) {
    if (template.sections.length === 0) continue
    // Idempotent: skip anything with the same name (built-in or custom).
    if (db.prepare('SELECT id FROM templates WHERE name = ?').get(template.name)) continue
    createTemplate({ name: template.name, sections: template.sections })
    created += 1
  }
  return created
}

export function importExercises(markdown: string): number {
  const parsed = parseExercisesFromMarkdown(markdown)
  let created = 0
  for (const exercise of parsed) {
    // Idempotent: skip anything with the same name (built-in or custom).
    if (db.prepare('SELECT id FROM exercises WHERE name = ?').get(exercise.name)) continue
    createExercise({ ...exercise })
    created += 1
  }
  return created
}

// --- Learning paths -------------------------------------------------------------

function completedStepIds(): Set<number> {
  const rows = db.prepare('SELECT step_id FROM path_step_state').all() as {
    step_id: number
  }[]
  return new Set(rows.map((row) => row.step_id))
}

export function listLearningPaths(): LearningPathSummary[] {
  const rows = db
    .prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM path_steps s WHERE s.path_id = p.id) AS step_count,
              (SELECT COUNT(*) FROM path_steps s
                JOIN path_step_state st ON st.step_id = s.id
                WHERE s.path_id = p.id) AS completed_steps
       FROM learning_paths p
       ORDER BY position, name`,
    )
    .all() as unknown as (LearningPathRow & {
    step_count: number
    completed_steps: number
  })[]

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    theme: row.theme,
    isBuiltin: row.is_builtin === 1,
    stepCount: row.step_count,
    completedSteps: row.completed_steps,
  }))
}

export function getLearningPath(id: number): LearningPathDetail | null {
  const path = db.prepare('SELECT * FROM learning_paths WHERE id = ?').get(
    id,
  ) as LearningPathRow | undefined
  if (!path) return null

  const steps = (
    db
      .prepare(
        `SELECT s.*, e.name AS exercise_name
         FROM path_steps s
         LEFT JOIN exercises e ON e.id = s.exercise_id
         WHERE s.path_id = ?
         ORDER BY s.position`,
      )
      .all(id) as unknown as (PathStepRow & { exercise_name: string | null })[]
  )
  const completed = completedStepIds()
  const titles = new Map(steps.map((step) => [step.id, step.title]))

  return {
    id: path.id,
    name: path.name,
    description: path.description,
    theme: path.theme,
    isBuiltin: path.is_builtin === 1,
    stepCount: steps.length,
    completedSteps: steps.filter((step) => completed.has(step.id)).length,
    steps: steps.map((step) => ({
      id: step.id,
      position: step.position,
      title: step.title,
      description: step.description,
      externalUrl: step.external_url,
      exerciseId: step.exercise_id,
      exerciseName: step.exercise_name,
      requiresStepId: step.requires_step_id,
      requiresTitle: step.requires_step_id === null ? null : titles.get(step.requires_step_id) ?? null,
      completed: completed.has(step.id),
      unlocked: isStepUnlocked(step.requires_step_id, completed),
    })),
  }
}

export function toggleStepCompletion(stepId: number, completed: boolean): void {
  const step = db.prepare('SELECT * FROM path_steps WHERE id = ?').get(
    stepId,
  ) as PathStepRow | undefined
  if (!step) throw new Error('Step not found.')

  if (completed) {
    if (!isStepUnlocked(step.requires_step_id, completedStepIds())) {
      throw new Error('This step is locked until its prerequisite is complete.')
    }
    db.prepare(
      'INSERT OR REPLACE INTO path_step_state (step_id, completed_at) VALUES (?, ?)',
    ).run(stepId, nowIso())
    return
  }

  const dependents = db
    .prepare(
      `SELECT COUNT(*) AS n FROM path_steps
       WHERE requires_step_id = ? AND id IN (SELECT step_id FROM path_step_state)`,
    )
    .get(stepId) as { n: number }
  if (Number(dependents.n) > 0) {
    throw new Error('Completed steps depend on this one — clear them first.')
  }
  db.prepare('DELETE FROM path_step_state WHERE step_id = ?').run(stepId)
}

// --- Workflow: streak dates, mood, weekly reviews -----------------------------

export function listSessionDates(): string[] {
  const rows = db.prepare('SELECT date(started_at) AS day FROM sessions').all() as {
    day: string
  }[]
  return rows.map((row) => row.day)
}

/** Distinct UTC days with an actual practice session (full or light). */
export function listPracticedDates(): string[] {
  const rows = db
    .prepare("SELECT DISTINCT date(started_at) AS day FROM sessions WHERE kind IN ('full', 'light')")
    .all() as { day: string }[]
  return rows.map((row) => row.day)
}

export function setSessionMood(sessionId: number, mood: Mood): void {
  const updated = db.prepare('UPDATE sessions SET mood = ? WHERE id = ?').run(mood, sessionId)
  if (Number(updated.changes) === 0) throw new Error('Session not found.')
}

interface ReviewRow {
  week_start: string
  practiced_everyday: number
  streak_count: number
  improved: string
  focus: string
  created_at: string
}

function mapReview(row: ReviewRow): WeeklyReview {
  return {
    weekStart: row.week_start,
    practicedEveryday: row.practiced_everyday === 1,
    streakCount: row.streak_count,
    improved: row.improved,
    focus: row.focus,
    createdAt: row.created_at,
  }
}

export function getWeeklyReview(weekStart: string): WeeklyReview | null {
  const row = db.prepare('SELECT * FROM weekly_reviews WHERE week_start = ?').get(
    weekStart,
  ) as ReviewRow | undefined
  return row ? mapReview(row) : null
}

export function saveWeeklyReview(review: Omit<WeeklyReview, 'createdAt'>): void {
  transaction(() => {
    db.prepare(
      `INSERT INTO weekly_reviews (week_start, practiced_everyday, streak_count, improved, focus, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(week_start) DO UPDATE SET
         practiced_everyday = excluded.practiced_everyday,
         streak_count = excluded.streak_count,
         improved = excluded.improved,
         focus = excluded.focus`,
    ).run(
      review.weekStart,
      review.practicedEveryday ? 1 : 0,
      review.streakCount,
      review.improved,
      review.focus,
      nowIso(),
    )
    // A non-empty focus becomes next week's pinned one thing.
    if (review.focus !== '') setOneThing(review.focus)
  })
}

export function listRecentReviews(limit: number): WeeklyReview[] {
  const rows = db
    .prepare('SELECT * FROM weekly_reviews ORDER BY week_start DESC LIMIT ?')
    .all(limit) as unknown as ReviewRow[]
  return rows.map(mapReview)
}

// --- Backup: full dump and restore --------------------------------------------

export function dumpAll(): AppExport {
  const templates = (db.prepare('SELECT * FROM templates ORDER BY id').all() as unknown as TemplateRow[]).map(
    (row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      isBuiltin: row.is_builtin === 1,
      sections: listSectionsForTemplate(row.id).map((section) => ({
        name: section.name,
        minutes: section.minutes,
      })),
    }),
  )

  const exercises = (db.prepare('SELECT * FROM exercises ORDER BY id').all() as unknown as ExerciseRow[]).map(
    mapExercise,
  )

  const exerciseProgress = (
    db.prepare('SELECT * FROM exercise_progress ORDER BY id').all() as unknown as ProgressRow[]
  ).map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    sessionId: row.session_id,
    maxCleanBpm: row.max_clean_bpm,
    avgBpm: row.avg_bpm,
    durationSeconds: row.duration_seconds,
    cleanStreak: row.clean_streak,
    selfRating: row.self_rating,
    notes: row.notes,
    completedAt: row.completed_at,
  }))

  const presets = (db.prepare('SELECT * FROM presets ORDER BY id').all() as unknown as PresetRow[]).map(
    mapPreset,
  )

  const sessions = (db.prepare('SELECT * FROM sessions ORDER BY id').all() as unknown as SessionRow[]).map(
    (row) => ({
      id: row.id,
      templateId: row.template_id,
      templateName: row.template_name,
      theme: row.theme,
      kind: row.kind,
      autoAdvance: row.auto_advance === 1,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      mood: row.mood,
      sections: listSectionsForSession(row.id).map((section) => ({
        position: section.position,
        name: section.name,
        plannedSeconds: section.planned_seconds,
        elapsedSeconds: section.elapsed_seconds,
        notes: section.notes,
        completedAt: section.completed_at,
      })),
    }),
  )

  const weeklyReviews = (
    db.prepare('SELECT * FROM weekly_reviews ORDER BY week_start').all() as unknown as ReviewRow[]
  ).map(mapReview)

  return {
    version: 1,
    exportedAt: nowIso(),
    oneThing: getOneThing(),
    templates,
    exercises,
    exerciseProgress,
    presets,
    sessions,
    weeklyReviews,
  }
}

export function restoreBackup(data: AppExport): void {
  transaction(() => {
    db.exec('DELETE FROM session_sections')
    db.exec('DELETE FROM exercise_progress')
    db.exec('DELETE FROM sessions')
    db.exec('DELETE FROM template_sections')
    db.exec('DELETE FROM exercises')
    db.exec('DELETE FROM templates')
    db.exec('DELETE FROM presets')
    db.exec('DELETE FROM weekly_reviews')

    const insertTemplate = db.prepare(
      'INSERT INTO templates (id, slug, name, is_builtin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    const insertTemplateSection = db.prepare(
      'INSERT INTO template_sections (template_id, position, name, minutes) VALUES (?, ?, ?, ?)',
    )
    for (const template of data.templates) {
      insertTemplate.run(
        template.id,
        template.slug,
        template.name,
        template.isBuiltin ? 1 : 0,
        nowIso(),
        nowIso(),
      )
      template.sections.forEach((section, position) => {
        insertTemplateSection.run(template.id, position, section.name, section.minutes)
      })
    }

    const insertExercise = db.prepare(
      'INSERT INTO exercises (id, name, has_timing, difficulty, tags, tab_text, is_builtin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    for (const exercise of data.exercises) {
      insertExercise.run(
        exercise.id,
        exercise.name,
        exercise.hasTiming ? 1 : 0,
        exercise.difficulty,
        JSON.stringify(exercise.tags),
        exercise.tabText,
        exercise.isBuiltin ? 1 : 0,
        exercise.createdAt,
        exercise.updatedAt,
      )
    }

    const insertProgress = db.prepare(
      `INSERT INTO exercise_progress
       (id, exercise_id, session_id, max_clean_bpm, avg_bpm, duration_seconds, clean_streak, self_rating, notes, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const entry of data.exerciseProgress) {
      insertProgress.run(
        entry.id,
        entry.exerciseId,
        entry.sessionId,
        entry.maxCleanBpm,
        entry.avgBpm,
        entry.durationSeconds,
        entry.cleanStreak,
        entry.selfRating,
        entry.notes,
        entry.completedAt,
      )
    }

    const insertPreset = db.prepare(
      'INSERT INTO presets (id, slug, name, is_builtin, bpm, beats, beat_unit, subdivision, accents, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    for (const preset of data.presets) {
      insertPreset.run(
        preset.id,
        preset.slug,
        preset.name,
        preset.isBuiltin ? 1 : 0,
        preset.bpm,
        preset.beats,
        preset.beatUnit,
        preset.subdivision,
        JSON.stringify(preset.accents),
        nowIso(),
      )
    }

    const insertSession = db.prepare(
      `INSERT INTO sessions
       (id, template_id, template_name, theme, kind, auto_advance, status, started_at, completed_at, mood)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    const insertSessionSection = db.prepare(
      'INSERT INTO session_sections (session_id, position, name, planned_seconds, elapsed_seconds, notes, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    for (const session of data.sessions) {
      insertSession.run(
        session.id,
        session.templateId,
        session.templateName,
        session.theme,
        session.kind,
        session.autoAdvance ? 1 : 0,
        session.status,
        session.startedAt,
        session.completedAt,
        session.mood,
      )
      for (const section of session.sections) {
        insertSessionSection.run(
          session.id,
          section.position,
          section.name,
          section.plannedSeconds,
          section.elapsedSeconds,
          section.notes,
          section.completedAt,
        )
      }
    }

    const insertReview = db.prepare(
      'INSERT INTO weekly_reviews (week_start, practiced_everyday, streak_count, improved, focus, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    for (const review of data.weeklyReviews) {
      insertReview.run(
        review.weekStart,
        review.practicedEveryday ? 1 : 0,
        review.streakCount,
        review.improved,
        review.focus,
        review.createdAt,
      )
    }

    setOneThing(data.oneThing)
  })
  // Re-seed so built-ins exist even if the backup predates them.
  seedDatabase(db)
}

// --- Audio tools: recordings and backing tracks ---------------------------------
// Note: restoreBackup deliberately leaves these tables untouched — audio blobs are
// big and out of scope for the v1 JSON backup format.

interface RecordingRow {
  id: number
  name: string
  mime: string
  duration_seconds: number
  session_id: number | null
  session_name: string | null
  exercise_id: number | null
  exercise_name: string | null
  is_reference: number
  created_at: string
}

interface TrackRow {
  id: number
  name: string
  source: 'file' | 'url'
  url: string | null
  mime: string | null
  created_at: string
}

function mapRecording(row: RecordingRow): RecordingSummary {
  return {
    id: row.id,
    name: row.name,
    mime: row.mime,
    durationSeconds: row.duration_seconds,
    sessionId: row.session_id,
    sessionName: row.session_name,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    isReference: row.is_reference === 1,
    createdAt: row.created_at,
  }
}

function mapTrack(row: TrackRow): BackingTrack {
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    url: row.url,
    mime: row.mime,
    createdAt: row.created_at,
  }
}

function getRecordingRow(id: number): RecordingRow {
  const row = db.prepare('SELECT * FROM recordings WHERE id = ?').get(
    id,
  ) as RecordingRow | undefined
  if (!row) throw new Error('Recording not found.')
  return row
}

export function createRecording(input: RecordingInput): RecordingSummary {
  let sessionName: string | null = null
  if (input.sessionId != null) {
    const row = db
      .prepare('SELECT template_name FROM sessions WHERE id = ?')
      .get(input.sessionId) as { template_name: string } | undefined
    if (!row) throw new Error('Session not found.')
    sessionName = row.template_name
  }

  let exerciseName: string | null = null
  if (input.exerciseId != null) {
    const row = db.prepare('SELECT name FROM exercises WHERE id = ?').get(
      input.exerciseId,
    ) as { name: string } | undefined
    if (!row) throw new Error('Exercise not found.')
    exerciseName = row.name
  }

  const result = db
    .prepare(
      `INSERT INTO recordings
        (name, mime, data, duration_seconds, session_id, session_name, exercise_id, exercise_name, is_reference, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    )
    .run(
      input.name,
      input.mime,
      input.data,
      input.durationSeconds,
      input.sessionId ?? null,
      sessionName,
      input.exerciseId ?? null,
      exerciseName,
      nowIso(),
    )
  return getRecording(Number(result.lastInsertRowid)) as RecordingSummary
}

export function getRecording(id: number): RecordingSummary | null {
  const row = db.prepare('SELECT * FROM recordings WHERE id = ?').get(
    id,
  ) as RecordingRow | undefined
  return row ? mapRecording(row) : null
}

export function listRecordings(exerciseId?: number): RecordingSummary[] {
  const rows = (
    exerciseId === undefined
      ? db.prepare('SELECT * FROM recordings ORDER BY created_at DESC, id DESC').all()
      : db
          .prepare(
            'SELECT * FROM recordings WHERE exercise_id = ? ORDER BY created_at DESC, id DESC',
          )
          .all(exerciseId)
  ) as unknown as RecordingRow[]
  return rows.map(mapRecording)
}

export function getRecordingData(
  id: number,
): { name: string; mime: string; durationSeconds: number; data: Uint8Array } | null {
  const row = db
    .prepare('SELECT name, mime, duration_seconds, data FROM recordings WHERE id = ?')
    .get(id) as
    | { name: string; mime: string; duration_seconds: number; data: Uint8Array }
    | undefined
  if (!row) return null
  return {
    name: row.name,
    mime: row.mime,
    durationSeconds: row.duration_seconds,
    data: row.data,
  }
}

export function deleteRecording(id: number): void {
  const updated = db.prepare('DELETE FROM recordings WHERE id = ?').run(id)
  if (Number(updated.changes) === 0) throw new Error('Recording not found.')
}

/** Re-point a take at an exercise (or clear the tag with null). */
export function tagRecordingToExercise(recordingId: number, exerciseId: number | null): void {
  getRecordingRow(recordingId)
  let exerciseName: string | null = null
  if (exerciseId !== null) {
    const row = db.prepare('SELECT name FROM exercises WHERE id = ?').get(
      exerciseId,
    ) as { name: string } | undefined
    if (!row) throw new Error('Exercise not found.')
    exerciseName = row.name
  }
  db.prepare('UPDATE recordings SET exercise_id = ?, exercise_name = ? WHERE id = ?').run(
    exerciseId,
    exerciseName,
    recordingId,
  )
}

/** One reference take per exercise; re-pointing moves the flag. */
export function setReference(recordingId: number, exerciseId: number): void {
  transaction(() => {
    const row = getRecordingRow(recordingId)
    if (row.exercise_id !== exerciseId) {
      throw new Error('Recording is not tagged to that exercise.')
    }
    db.prepare('UPDATE recordings SET is_reference = 0 WHERE exercise_id = ? AND id <> ?').run(
      exerciseId,
      recordingId,
    )
    db.prepare('UPDATE recordings SET is_reference = 1 WHERE id = ?').run(recordingId)
  })
}

export function getReferenceRecording(exerciseId: number): RecordingSummary | null {
  const row = db
    .prepare('SELECT * FROM recordings WHERE exercise_id = ? AND is_reference = 1')
    .get(exerciseId) as RecordingRow | undefined
  return row ? mapRecording(row) : null
}

export function createTrack(input: TrackInput): BackingTrack {
  const result = db
    .prepare('INSERT INTO tracks (name, source, url, mime, data, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      input.name,
      input.source,
      input.url ?? null,
      input.mime ?? null,
      input.data ?? null,
      nowIso(),
    )
  const row = db
    .prepare('SELECT * FROM tracks WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as unknown as TrackRow
  return mapTrack(row)
}

export function getTrack(id: number): BackingTrack | null {
  const row = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id) as
    | TrackRow
    | undefined
  return row ? mapTrack(row) : null
}

export function listTracks(): BackingTrack[] {
  const rows = db
    .prepare('SELECT * FROM tracks ORDER BY created_at DESC, id DESC')
    .all() as unknown as TrackRow[]
  return rows.map(mapTrack)
}

/** Null for URL-backed tracks (bytes live on the remote server). */
export function getTrackData(id: number): { name: string; mime: string; data: Uint8Array } | null {
  const row = db
    .prepare("SELECT name, mime, data FROM tracks WHERE id = ? AND source = 'file'")
    .get(id) as { name: string; mime: string; data: Uint8Array } | undefined
  if (!row || !row.data) return null
  return { name: row.name, mime: row.mime, data: row.data }
}

export function deleteTrack(id: number): void {
  const updated = db.prepare('DELETE FROM tracks WHERE id = ?').run(id)
  if (Number(updated.changes) === 0) throw new Error('Track not found.')
}
