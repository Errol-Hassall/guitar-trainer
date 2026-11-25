import { z } from 'zod'
import { MOODS, SESSION_KINDS, SUBDIVISIONS, THEMES } from '#/lib/types'

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

export const setMoodSchema = z.object({
  id: idSchema,
  mood: z.enum(MOODS),
})

export const saveWeeklyReviewSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Week start must be YYYY-MM-DD'),
  practicedEveryday: z.boolean(),
  streakCount: z.number().int().min(0).max(36_500),
  improved: z.string().max(4000),
  focus: z.string().max(4000),
})

export const importTemplatesSchema = z.object({
  markdown: z.string().min(1).max(200_000),
})

export const weeklyReviewIdSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const recentReviewsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(5),
})

const exportSectionSchema = z.object({
  name: z.string().min(1).max(40),
  minutes: z.number().int().min(1).max(180),
})

const exportTemplateSchema = z.object({
  id: idSchema,
  slug: z.string().nullable(),
  name: z.string().min(1).max(60),
  isBuiltin: z.boolean(),
  sections: z.array(exportSectionSchema).max(12),
})

const exportSessionSectionSchema = z.object({
  position: z.number().int().min(0),
  name: z.string().min(1).max(40),
  plannedSeconds: z.number().int().positive(),
  elapsedSeconds: z.number().int().min(0).max(86_400),
  notes: z.string().max(4000),
  completedAt: z.string().nullable(),
})

const exportSessionSchema = z.object({
  id: idSchema,
  templateId: idSchema.nullable(),
  templateName: z.string().min(1).max(60),
  theme: z.enum(THEMES),
  kind: z.enum(SESSION_KINDS),
  autoAdvance: z.boolean(),
  status: z.enum(['active', 'completed']),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  mood: z.enum(MOODS).nullable(),
  sections: z.array(exportSessionSectionSchema).max(12),
})

const exportExerciseSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(60),
  hasTiming: z.boolean(),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(z.string().max(24)).max(8),
  tabText: z.string().max(4000),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const exportProgressSchema = z.object({
  id: idSchema,
  exerciseId: idSchema,
  sessionId: idSchema.nullable(),
  maxCleanBpm: z.number().int().min(1).max(999).nullable(),
  avgBpm: z.number().int().min(1).max(999).nullable(),
  durationSeconds: z.number().int().min(0),
  cleanStreak: z.number().int().min(0).nullable(),
  selfRating: z.number().int().min(1).max(5).nullable(),
  notes: z.string().max(4000),
  completedAt: z.string(),
})

const exportPresetSchema = z.object({
  id: idSchema,
  slug: z.string().nullable(),
  name: z.string().min(1).max(40),
  isBuiltin: z.boolean(),
  bpm: z.number().int().min(1).max(999),
  beats: z.number().int().min(1).max(16),
  beatUnit: beatUnitSchema,
  subdivision: z.enum(SUBDIVISIONS),
  accents: z.array(accentLevelSchema).min(1).max(16),
})

const exportReviewSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  practicedEveryday: z.boolean(),
  streakCount: z.number().int().min(0),
  improved: z.string().max(4000),
  focus: z.string().max(4000),
  createdAt: z.string(),
})

export const restoreBackupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  oneThing: z.string().max(500),
  templates: z.array(exportTemplateSchema).max(1000),
  exercises: z.array(exportExerciseSchema).max(1000),
  exerciseProgress: z.array(exportProgressSchema).max(100_000),
  presets: z.array(exportPresetSchema).max(1000),
  sessions: z.array(exportSessionSchema).max(100_000),
  weeklyReviews: z.array(exportReviewSchema).max(1000),
})
