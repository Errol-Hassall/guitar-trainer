import { createServerFn } from '@tanstack/react-start'
import * as repo from './repo'
import { exportJson, exportMarkdown, sessionsCsv } from '#/lib/export'
import {
  autoAdvanceSchema,
  completeSectionSchema,
  createExerciseSchema,
  createTemplateSchema,
  deleteExerciseSchema,
  deletePresetSchema,
  deleteTemplateSchema,
  exerciseIdSchema,
  importTemplatesSchema,
  listSessionsSchema,
  logProgressSchema,
  oneThingSchema,
  recentReviewsSchema,
  restoreBackupSchema,
  restDaySchema,
  savePresetSchema,
  saveSectionNotesSchema,
  saveWeeklyReviewSchema,
  sessionIdSchema,
  setMoodSchema,
  startSessionSchema,
  templateIdSchema,
  updateExerciseSchema,
  updateTemplateSchema,
  weeklyReviewIdSchema,
} from './schemas'

export const listTemplates = createServerFn({ method: 'GET' }).handler(() =>
  repo.listTemplates(),
)

export const getTemplate = createServerFn({ method: 'GET' })
  .validator(templateIdSchema)
  .handler(({ data }) => repo.getTemplate(data.id))

export const createTemplate = createServerFn({ method: 'POST' })
  .validator(createTemplateSchema)
  .handler(({ data }) => repo.createTemplate(data))

export const updateTemplate = createServerFn({ method: 'POST' })
  .validator(updateTemplateSchema)
  .handler(({ data }) => repo.updateTemplate(data))

export const deleteTemplate = createServerFn({ method: 'POST' })
  .validator(deleteTemplateSchema)
  .handler(({ data }) => repo.deleteTemplate(data.id))

export const listPresets = createServerFn({ method: 'GET' }).handler(() =>
  repo.listPresets(),
)

export const savePreset = createServerFn({ method: 'POST' })
  .validator(savePresetSchema)
  .handler(({ data }) => repo.createPreset(data))

export const deletePreset = createServerFn({ method: 'POST' })
  .validator(deletePresetSchema)
  .handler(({ data }) => repo.deletePreset(data.id))

export const getActiveSession = createServerFn({ method: 'GET' }).handler(() =>
  repo.getActiveSession(),
)

export const getSession = createServerFn({ method: 'GET' })
  .validator(sessionIdSchema)
  .handler(({ data }) => repo.getSession(data.id))

export const listSessions = createServerFn({ method: 'GET' })
  .validator(listSessionsSchema)
  .handler(({ data }) => repo.listSessions(data.limit))

export const startSession = createServerFn({ method: 'POST' })
  .validator(startSessionSchema)
  .handler(({ data }) => ({ id: repo.startSession(data) }))

export const startRestDay = createServerFn({ method: 'POST' })
  .validator(restDaySchema)
  .handler(({ data }) => ({ id: repo.startRestDay(data.theme) }))

export const completeSection = createServerFn({ method: 'POST' })
  .validator(completeSectionSchema)
  .handler(({ data }) =>
    repo.completeSection(data.sectionId, data.elapsedSeconds),
  )

export const saveSectionNotes = createServerFn({ method: 'POST' })
  .validator(saveSectionNotesSchema)
  .handler(({ data }) => {
    repo.saveSectionNotes(data.sectionId, data.notes)
    return true
  })

export const setAutoAdvance = createServerFn({ method: 'POST' })
  .validator(autoAdvanceSchema)
  .handler(({ data }) => {
    repo.setAutoAdvance(data.sessionId, data.autoAdvance)
    return true
  })

export const completeSession = createServerFn({ method: 'POST' })
  .validator(sessionIdSchema)
  .handler(({ data }) => {
    repo.completeSession(data.id)
    return true
  })

export const getOneThing = createServerFn({ method: 'GET' }).handler(() =>
  repo.getOneThing(),
)

export const setOneThing = createServerFn({ method: 'POST' })
  .validator(oneThingSchema)
  .handler(({ data }) => {
    repo.setOneThing(data.text)
    return true
  })

export const listExercises = createServerFn({ method: 'GET' }).handler(() =>
  repo.listExercises(),
)

export const getExercise = createServerFn({ method: 'GET' })
  .validator(exerciseIdSchema)
  .handler(({ data }) => repo.getExercise(data.id))

export const createExercise = createServerFn({ method: 'POST' })
  .validator(createExerciseSchema)
  .handler(({ data }) => repo.createExercise(data))

export const updateExercise = createServerFn({ method: 'POST' })
  .validator(updateExerciseSchema)
  .handler(({ data }) => repo.updateExercise(data))

export const deleteExercise = createServerFn({ method: 'POST' })
  .validator(deleteExerciseSchema)
  .handler(({ data }) => {
    repo.deleteExercise(data.id)
    return true
  })

export const listProgress = createServerFn({ method: 'GET' })
  .validator(exerciseIdSchema)
  .handler(({ data }) => repo.listProgress(data.id))

export const logProgress = createServerFn({ method: 'POST' })
  .validator(logProgressSchema)
  .handler(({ data }) => {
    repo.logProgress(data)
    return true
  })

// --- Workflow -----------------------------------------------------------------

export const listSessionDates = createServerFn({ method: 'GET' }).handler(() =>
  repo.listSessionDates(),
)

export const listPracticedDates = createServerFn({ method: 'GET' }).handler(() =>
  repo.listPracticedDates(),
)

export const setSessionMood = createServerFn({ method: 'POST' })
  .validator(setMoodSchema)
  .handler(({ data }) => {
    repo.setSessionMood(data.id, data.mood)
    return true
  })

export const getWeeklyReview = createServerFn({ method: 'GET' })
  .validator(weeklyReviewIdSchema)
  .handler(({ data }) => repo.getWeeklyReview(data.weekStart))

export const saveWeeklyReview = createServerFn({ method: 'POST' })
  .validator(saveWeeklyReviewSchema)
  .handler(({ data }) => {
    repo.saveWeeklyReview(data)
    return true
  })

export const listRecentReviews = createServerFn({ method: 'GET' })
  .validator(recentReviewsSchema)
  .handler(({ data }) => repo.listRecentReviews(data.limit))

// --- Data & backup --------------------------------------------------------------

export const getMarkdownExport = createServerFn({ method: 'GET' }).handler(() =>
  exportMarkdown(repo.dumpAll()),
)

export const getJsonExport = createServerFn({ method: 'GET' }).handler(() =>
  exportJson(repo.dumpAll()),
)

export const getCsvExport = createServerFn({ method: 'GET' }).handler(() => {
  const dump = repo.dumpAll()
  return sessionsCsv(dump.sessions)
})

export const restoreBackup = createServerFn({ method: 'POST' })
  .validator(restoreBackupSchema)
  .handler(({ data }) => {
    repo.restoreBackup(data)
    return true
  })

export const importTemplates = createServerFn({ method: 'POST' })
  .validator(importTemplatesSchema)
  .handler(({ data }) => repo.importTemplates(data.markdown))
