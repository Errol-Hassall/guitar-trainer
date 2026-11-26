export const APP_NAME = 'Guitar Trainer'

export const BPM_MIN = 1
export const BPM_MAX = 999
export const PRACTICAL_BPM_MIN = 40
export const PRACTICAL_BPM_MAX = 250

export const BEAT_UNITS = [2, 4, 8, 16] as const
export type BeatUnit = (typeof BEAT_UNITS)[number]

export const SUBDIVISIONS = [
  'none',
  'eighth',
  'sixteenth',
  'triplet',
  'swing',
  'gallop',
] as const
export type Subdivision = (typeof SUBDIVISIONS)[number]

export const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  none: 'Beats only',
  eighth: '8th notes',
  sixteenth: '16th notes',
  triplet: 'Triplets',
  swing: 'Shuffle (long–short)',
  gallop: 'Gallop (short–long)',
}

export const CLICK_SOUNDS = ['woodblock', 'beep', 'cowbell', 'click'] as const
export type ClickSound = (typeof CLICK_SOUNDS)[number]

export const CLICK_SOUND_LABELS: Record<ClickSound, string> = {
  woodblock: 'Woodblock',
  beep: 'Beep',
  cowbell: 'Cowbell',
  click: 'Click',
}

export const ACCENT_LEVELS = [0, 1, 2, 3] as const
export type AccentLevel = (typeof ACCENT_LEVELS)[number]

export const ACCENT_LABELS: Record<AccentLevel, string> = {
  0: 'Normal',
  1: 'Accent',
  2: 'Dominant',
  3: 'Rest',
}

export const ACCENT_SHORT: Record<AccentLevel, string> = {
  0: '·',
  1: 'A',
  2: 'D',
  3: 'R',
}

export const THEMES = [
  'Picking & Pulse',
  'Legato & Groove',
  'Chords & Subdivision',
  'Accuracy & Transcription',
  'Expression & Progressions',
  'Integration & Play',
  'Light & Reflective',
] as const
export type Theme = (typeof THEMES)[number]

export const SESSION_KINDS = ['full', 'light', 'rest'] as const
export type SessionKind = (typeof SESSION_KINDS)[number]

export type SessionStatus = 'active' | 'completed'

export const MOODS = ['energized', 'neutral', 'drained'] as const
export type Mood = (typeof MOODS)[number]

export interface WeeklyReview {
  weekStart: string
  practicedEveryday: boolean
  streakCount: number
  improved: string
  focus: string
  createdAt: string
}

export interface TemplateSection {
  id: number
  position: number
  name: string
  minutes: number
}

export interface Template {
  id: number
  slug: string | null
  name: string
  isBuiltin: boolean
  createdAt: string
  updatedAt: string
  sections: TemplateSection[]
}

export interface TemplateSectionInput {
  name: string
  minutes: number
}

export interface TemplateInput {
  name: string
  sections: TemplateSectionInput[]
}

export interface UpdateTemplateInput extends TemplateInput {
  id: number
}

export interface StartSessionInput {
  templateId: number
  kind: 'full' | 'light'
  theme: Theme
}

export interface SessionSection {
  id: number
  position: number
  name: string
  plannedSeconds: number
  elapsedSeconds: number
  notes: string
  completedAt: string | null
}

export interface PracticeSession {
  id: number
  templateId: number | null
  templateName: string
  theme: Theme
  kind: SessionKind
  autoAdvance: boolean
  status: SessionStatus
  startedAt: string
  completedAt: string | null
  mood: Mood | null
  sections: SessionSection[]
}

export interface SessionSummary {
  id: number
  templateName: string
  theme: Theme
  kind: SessionKind
  status: SessionStatus
  startedAt: string
  completedAt: string | null
  sectionCount: number
  completedSections: number
  totalSeconds: number
  mood: Mood | null
}

export interface MetronomePreset {
  id: number
  slug: string | null
  name: string
  isBuiltin: boolean
  bpm: number
  beats: number
  beatUnit: BeatUnit
  subdivision: Subdivision
  accents: AccentLevel[]
}

export interface PresetInput {
  name: string
  bpm: number
  beats: number
  beatUnit: BeatUnit
  subdivision: Subdivision
  accents: AccentLevel[]
}

export interface Exercise {
  id: number
  name: string
  hasTiming: boolean
  difficulty: number
  tags: string[]
  tabText: string
  isBuiltin: boolean
  createdAt: string
  updatedAt: string
}

export interface LearningPathStep {
  id: number
  position: number
  title: string
  description: string
  externalUrl: string | null
  exerciseId: number | null
  exerciseName: string | null
  requiresStepId: number | null
  requiresTitle: string | null
  completed: boolean
  unlocked: boolean
}

export interface LearningPathSummary {
  id: number
  name: string
  description: string
  theme: Theme
  isBuiltin: boolean
  stepCount: number
  completedSteps: number
}

export interface LearningPathDetail extends LearningPathSummary {
  steps: LearningPathStep[]
}

export interface ExerciseInput {
  name: string
  hasTiming: boolean
  difficulty: number
  tags: string[]
  tabText: string
}

export interface UpdateExerciseInput extends ExerciseInput {
  id: number
}

export interface ExerciseSummary extends Exercise {
  logCount: number
  latestBpm: number | null
  latestRating: number | null
  /** ISO timestamp of the most recent progress log, or null when never practiced. */
  lastPracticedAt: string | null
}

export interface ExerciseProgress {
  id: number
  exerciseId: number
  sessionName: string | null
  maxCleanBpm: number | null
  avgBpm: number | null
  durationSeconds: number
  cleanStreak: number | null
  selfRating: number | null
  notes: string
  completedAt: string
}

export interface LogProgressInput {
  exerciseId: number
  maxCleanBpm?: number | null
  avgBpm?: number | null
  durationSeconds?: number
  cleanStreak?: number | null
  selfRating?: number | null
  notes?: string
}

import type { EarDrillId } from './ear'

/** Accumulated ear-training score for one drill (and level, where it has any). */
export interface EarStat {
  drill: EarDrillId
  level: number
  attempts: number
  correct: number
  updatedAt: string
}

export interface RecordingSummary {
  id: number
  name: string
  mime: string
  durationSeconds: number
  sessionId: number | null
  sessionName: string | null
  exerciseId: number | null
  exerciseName: string | null
  isReference: boolean
  createdAt: string
}

/** Repo-level input; the API layer decodes `dataB64` into `data` first. */
export interface RecordingInput {
  name: string
  mime: string
  data: Uint8Array
  durationSeconds: number
  sessionId?: number | null
  exerciseId?: number | null
}

export interface BackingTrack {
  id: number
  name: string
  source: 'file' | 'url'
  url: string | null
  mime: string | null
  createdAt: string
}

/** Repo-level input; the API layer decodes `dataB64` into `data` first. */
export interface TrackInput {
  name: string
  source: 'file' | 'url'
  data?: Uint8Array
  mime?: string
  url?: string
}

/** Shape of the JSON backup file (versioned; restore validates against this). */
export interface AppExport {
  version: 1
  exportedAt: string
  oneThing: string
  templates: {
    id: number
    slug: string | null
    name: string
    isBuiltin: boolean
    sections: { name: string; minutes: number }[]
  }[]
  exercises: Exercise[]
  exerciseProgress: {
    id: number
    exerciseId: number
    sessionId: number | null
    maxCleanBpm: number | null
    avgBpm: number | null
    durationSeconds: number
    cleanStreak: number | null
    selfRating: number | null
    notes: string
    completedAt: string
  }[]
  presets: MetronomePreset[]
  sessions: {
    id: number
    templateId: number | null
    templateName: string
    theme: Theme
    kind: SessionKind
    autoAdvance: boolean
    status: SessionStatus
    startedAt: string
    completedAt: string | null
    mood: Mood | null
    sections: {
      position: number
      name: string
      plannedSeconds: number
      elapsedSeconds: number
      notes: string
      completedAt: string | null
    }[]
  }[]
  weeklyReviews: WeeklyReview[]
}
