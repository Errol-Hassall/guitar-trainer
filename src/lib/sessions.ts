import type {
  SessionKind,
  SessionSection,
  TemplateSection,
  Theme,
} from '#/lib/types'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const THEMES_BY_WEEKDAY: Theme[] = [
  'Light & Reflective',
  'Picking & Pulse',
  'Legato & Groove',
  'Chords & Subdivision',
  'Accuracy & Transcription',
  'Expression & Progressions',
  'Integration & Play',
]

export function themeForWeekday(date: Date): Theme {
  return THEMES_BY_WEEKDAY[date.getUTCDay()]
}

export function plannedSeconds(
  minutes: number,
  kind: 'full' | 'light',
): number {
  const full = minutes * 60
  return kind === 'light' ? Math.max(60, Math.ceil(full / 2)) : full
}

export function totalMinutes(sections: TemplateSection[]): number {
  return sections.reduce((total, section) => total + section.minutes, 0)
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const pad = (value: number) => String(value).padStart(2, '0')

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  return `${minutes}:${pad(seconds)}`
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0 min'
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 1) return '<1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`
}

export function formatUtcDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

export function firstIncompleteIndex(sections: SessionSection[]): number {
  return sections.findIndex((section) => section.completedAt === null)
}

export function sumElapsedSeconds(sections: SessionSection[]): number {
  return sections.reduce(
    (total, section) => total + section.elapsedSeconds,
    0,
  )
}

export function sessionKindLabel(kind: SessionKind): string {
  if (kind === 'rest') return 'Rest day'
  if (kind === 'light') return 'Light session'
  return 'Full session'
}
