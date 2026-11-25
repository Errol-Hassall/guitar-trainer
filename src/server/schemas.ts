import { z } from 'zod'
import { SESSION_KINDS, SUBDIVISIONS, THEMES } from '#/lib/types'

export const idSchema = z.number().int().positive()

export const beatUnitSchema = z.union([
  z.literal(2),
  z.literal(4),
  z.literal(8),
  z.literal(16),
])

export const accentLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
])

export const templateSectionInputSchema = z.object({
  name: z.string().trim().min(1, 'Section name is required').max(40),
  minutes: z.number().int().min(1).max(180),
})

export const templateInputSchema = z.object({
  name: z.string().trim().min(1, 'Template name is required').max(60),
  sections: z.array(templateSectionInputSchema).min(1).max(12),
})

export const createTemplateSchema = templateInputSchema

export const updateTemplateSchema = templateInputSchema.extend({
  id: idSchema,
})

export const deleteTemplateSchema = z.object({ id: idSchema })

export const templateIdSchema = z.object({ id: idSchema })

export const startSessionSchema = z.object({
  templateId: idSchema,
  kind: z.enum(['full', 'light']),
  theme: z.enum(THEMES),
})

export const restDaySchema = z.object({
  theme: z.enum(THEMES),
})

export const sessionIdSchema = z.object({ id: idSchema })

export const completeSectionSchema = z.object({
  sectionId: idSchema,
  elapsedSeconds: z.number().int().min(0).max(86_400),
})

export const saveSectionNotesSchema = z.object({
  sectionId: idSchema,
  notes: z.string().max(4000),
})

export const autoAdvanceSchema = z.object({
  sessionId: idSchema,
  autoAdvance: z.boolean(),
})

export const oneThingSchema = z.object({
  text: z.string().max(500),
})

export const savePresetSchema = z
  .object({
    name: z.string().trim().min(1, 'Preset name is required').max(40),
    bpm: z.number().int().min(1).max(999),
    beats: z.number().int().min(1).max(16),
    beatUnit: beatUnitSchema,
    subdivision: z.enum(SUBDIVISIONS),
    accents: z.array(accentLevelSchema).min(1).max(16),
  })
  .refine((preset) => preset.accents.length === preset.beats, {
    message: 'Accent pattern must match the number of beats',
    path: ['accents'],
  })

export const deletePresetSchema = z.object({ id: idSchema })

export const listSessionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
})

export const sessionKindSchema = z.enum(SESSION_KINDS)

export const exerciseInputSchema = z.object({
  name: z.string().trim().min(1, 'Exercise name is required').max(60),
  hasTiming: z.boolean(),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(z.string().trim().min(1).max(24)).max(8),
  tabText: z.string().max(4000),
})

export const createExerciseSchema = exerciseInputSchema

export const updateExerciseSchema = exerciseInputSchema.extend({
  id: idSchema,
})

export const deleteExerciseSchema = z.object({ id: idSchema })

export const exerciseIdSchema = z.object({ id: idSchema })

export const logProgressSchema = z.object({
  exerciseId: idSchema,
  maxCleanBpm: z.number().int().min(1).max(999).nullable().optional(),
  avgBpm: z.number().int().min(1).max(999).nullable().optional(),
  durationSeconds: z.number().int().min(0).max(86_400).default(0),
  cleanStreak: z.number().int().min(0).max(10_000).nullable().optional(),
  selfRating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(4000).default(''),
})
