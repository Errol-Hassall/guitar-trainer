import { createServerFn } from '@tanstack/react-start'
import * as repo from './repo'
import {
  autoAdvanceSchema,
  completeSectionSchema,
  createTemplateSchema,
  deletePresetSchema,
  deleteTemplateSchema,
  listSessionsSchema,
  oneThingSchema,
  restDaySchema,
  savePresetSchema,
  saveSectionNotesSchema,
  sessionIdSchema,
  startSessionSchema,
  templateIdSchema,
  updateTemplateSchema,
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
