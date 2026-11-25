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
] as const
export type Subdivision = (typeof SUBDIVISIONS)[number]

export const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  none: 'Beats only',
  eighth: '8th notes',
  sixteenth: '16th notes',
  triplet: 'Triplets',
  swing: 'Swing 8ths',
}

export const CLICK_SOUNDS = ['woodblock', 'beep', 'cowbell', 'click'] as const
export type ClickSound = (typeof CLICK_SOUNDS)[number]

export const CLICK_SOUND_LABELS: Record<ClickSound, string> = {
  woodblock: 'Woodblock',
  beep: 'Beep',
  cowbell: 'Cowbell',
  click: 'Click',
}

export const ACCENT_LEVELS = [0, 1, 2] as const
export type AccentLevel = (typeof ACCENT_LEVELS)[number]

export const ACCENT_LABELS: Record<AccentLevel, string> = {
  0: 'Normal',
  1: 'Accent',
  2: 'Dominant',
}

export const ACCENT_SHORT: Record<AccentLevel, string> = {
  0: '·',
  1: 'A',
  2: 'D',
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
