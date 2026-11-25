import type { AppExport } from './types'

export function exportJson(data: AppExport): string {
  return JSON.stringify(data, null, 2)
}

function csvField(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function sessionsCsv(sessions: AppExport['sessions']): string {
  const header =
    'started_at,completed_at,template_name,kind,status,theme,sections_total,sections_completed,seconds,mood'
  const rows = sessions.map((session) =>
    [
      session.startedAt,
      session.completedAt ?? '',
      session.templateName,
      session.kind,
      session.status,
      session.theme,
      session.sections.length,
      session.sections.filter((section) => section.completedAt !== null).length,
      session.sections.reduce((sum, section) => sum + section.elapsedSeconds, 0),
      session.mood ?? '',
    ]
      .map(csvField)
      .join(','),
  )
  return [header, ...rows].join('\n')
}

export function exportMarkdown(data: AppExport): string {
  const lines: string[] = ['# Guitar Trainer export', '']
  lines.push(`_Exported ${data.exportedAt}_`, '')

  lines.push('## One thing to fix this week')
  lines.push(data.oneThing !== '' ? data.oneThing : '(none)', '')

  lines.push('## Templates')
  for (const template of data.templates) {
    lines.push(`### ${template.name}${template.isBuiltin ? ' (built-in)' : ''}`)
    for (const section of template.sections) {
      lines.push(`- ${section.name} — ${section.minutes} min`)
    }
    lines.push('')
  }

  lines.push('## Exercises')
  if (data.exercises.length === 0) lines.push('(none)', '')
  for (const exercise of data.exercises) {
    lines.push(
      `### ${exercise.name} (${exercise.hasTiming ? 'timed' : 'untimed'} · difficulty ${exercise.difficulty})`,
    )
    if (exercise.tags.length > 0) lines.push(`Tags: ${exercise.tags.join(', ')}`)
    if (exercise.tabText !== '') lines.push('```', exercise.tabText, '```')
    lines.push('')
  }

  lines.push('## Sessions')
  lines.push('| Date | Template | Kind | Mood |')
  lines.push('| --- | --- | --- | --- |')
  for (const session of data.sessions) {
    lines.push(
      `| ${session.startedAt.slice(0, 10)} | ${session.templateName} | ${session.kind} | ${session.mood ?? ''} |`,
    )
  }
  lines.push('')

  lines.push('## Weekly reviews')
  if (data.weeklyReviews.length === 0) lines.push('(none)', '')
  for (const review of data.weeklyReviews) {
    lines.push(
      `- Week ${review.weekStart} · streak ${review.streakCount} · practiced every day: ${review.practicedEveryday ? 'yes' : 'no'}`,
    )
    if (review.improved !== '') lines.push(`  - Improved: ${review.improved}`)
    if (review.focus !== '') lines.push(`  - Focus: ${review.focus}`)
  }
  lines.push('')

  return lines.join('\n')
}

export interface ParsedTemplate {
  name: string
  isBuiltin: boolean
  sections: { name: string; minutes: number }[]
}

const SECTION_LINE = /^- (.+) — (\d+) min$/

/** Extract templates from our export format (the '## Templates' section). */
export function parseTemplatesFromMarkdown(text: string): ParsedTemplate[] {
  const lines = text.split('\n')
  const start = lines.findIndex((line) => line.trim() === '## Templates')
  if (start === -1) return []
  const end = lines.findIndex((line, index) => index > start && /^## /.test(line))
  const block = lines.slice(start + 1, end === -1 ? lines.length : end)

  const templates: ParsedTemplate[] = []
  let current: ParsedTemplate | null = null
  for (const line of block) {
    const heading = line.match(/^### (.+?)( \(built-in\))?$/)
    if (heading) {
      current = { name: heading[1], isBuiltin: heading[2] !== undefined, sections: [] }
      templates.push(current)
      continue
    }
    if (!current) continue
    const section = line.match(SECTION_LINE)
    if (section) current.sections.push({ name: section[1], minutes: Number(section[2]) })
  }
  return templates
}

export interface ParsedExercise {
  name: string
  hasTiming: boolean
  difficulty: number
  tags: string[]
  tabText: string
}

const EXERCISE_HEADING = /^### (.+?) \((timed|untimed) · difficulty (\d+)\)$/

/** Extract exercises from our export format (the '## Exercises' section). */
export function parseExercisesFromMarkdown(text: string): ParsedExercise[] {
  const lines = text.split('\n')
  const start = lines.findIndex((line) => line.trim() === '## Exercises')
  if (start === -1) return []
  const end = lines.findIndex((line, index) => index > start && /^## /.test(line))
  const block = lines.slice(start + 1, end === -1 ? lines.length : end)

  const exercises: ParsedExercise[] = []
  let current: ParsedExercise | null = null
  let inTabFence = false
  for (const line of block) {
    if (line.trim() === '```') {
      inTabFence = !inTabFence
      continue
    }
    const heading = line.match(EXERCISE_HEADING)
    if (heading) {
      current = {
        name: heading[1],
        hasTiming: heading[2] === 'timed',
        difficulty: Number(heading[3]),
        tags: [],
        tabText: '',
      }
      exercises.push(current)
      inTabFence = false
      continue
    }
    if (!current) continue
    if (inTabFence) {
      current.tabText = current.tabText === '' ? line : `${current.tabText}\n${line}`
      continue
    }
    const tags = line.match(/^Tags: (.+)$/)
    if (tags) {
      current.tags = tags[1]
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== '')
    }
  }
  return exercises
}
