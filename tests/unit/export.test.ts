import { describe, expect, it } from 'vitest'
import type { AppExport } from '#/lib/types'
import {
  exportJson,
  exportMarkdown,
  parseTemplatesFromMarkdown,
  sessionsCsv,
} from '#/lib/export'

const data: AppExport = {
  version: 1,
  exportedAt: '2026-11-25T10:00:00.000Z',
  oneThing: 'Keep time on the last bar.',
  templates: [
    {
      id: 1,
      slug: 'daily-60',
      name: 'Daily 60',
      isBuiltin: true,
      sections: [
        { name: 'Warm-up', minutes: 5 },
        { name: 'Technique', minutes: 12 },
      ],
    },
    {
      id: 2,
      slug: null,
      name: 'My drill, with comma',
      isBuiltin: false,
      sections: [{ name: 'Focus', minutes: 10 }],
    },
  ],
  exercises: [
    {
      id: 1,
      name: 'Picking drill',
      hasTiming: true,
      difficulty: 3,
      tags: ['Technique'],
      tabText: 'e|---0-2-4-',
      createdAt: '2026-11-01T09:00:00.000Z',
      updatedAt: '2026-11-01T09:00:00.000Z',
    },
  ],
  exerciseProgress: [
    {
      id: 1,
      exerciseId: 1,
      sessionId: null,
      maxCleanBpm: 120,
      avgBpm: 95,
      durationSeconds: 300,
      cleanStreak: 4,
      selfRating: null,
      notes: '',
      completedAt: '2026-11-20T18:00:00.000Z',
    },
  ],
  presets: [],
  sessions: [
    {
      id: 1,
      templateId: 1,
      templateName: 'Daily 60',
      theme: 'Picking & Pulse',
      kind: 'full',
      autoAdvance: true,
      status: 'completed',
      startedAt: '2026-11-25T09:00:00.000Z',
      completedAt: '2026-11-25T10:00:00.000Z',
      mood: 'energized',
      sections: [
        {
          position: 0,
          name: 'Warm-up',
          plannedSeconds: 300,
          elapsedSeconds: 280,
          notes: '',
          completedAt: '2026-11-25T09:05:00.000Z',
        },
      ],
    },
  ],
  weeklyReviews: [
    {
      weekStart: '2026-11-17',
      practicedEveryday: true,
      streakCount: 7,
      improved: 'Cleaner alternate picking.',
      focus: 'Slurs under the click.',
      createdAt: '2026-11-23T20:00:00.000Z',
    },
  ],
}

describe('exportJson', () => {
  it('round-trips a versioned dump', () => {
    const parsed = JSON.parse(exportJson(data)) as AppExport
    expect(parsed.version).toBe(1)
    expect(parsed.oneThing).toBe(data.oneThing)
    expect(parsed.templates).toEqual(data.templates)
    expect(parsed.sessions[0].mood).toBe('energized')
  })
})

describe('sessionsCsv', () => {
  it('writes a header and one row per session with quoted text fields', () => {
    const csv = sessionsCsv([
      {
        ...data.sessions[0],
        templateName: 'Daily, 60',
        sections: [
          data.sessions[0].sections[0],
          {
            position: 1,
            name: 'Technique',
            plannedSeconds: 720,
            elapsedSeconds: 600,
            notes: '',
            completedAt: null,
          },
        ],
      },
    ])
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe(
      'started_at,completed_at,template_name,kind,status,theme,sections_total,sections_completed,seconds,mood',
    )
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('"Daily, 60"')
    expect(lines[1]).toContain('2,1,880,energized')
  })

  it('handles an empty list with just the header', () => {
    expect(sessionsCsv([]).trim()).toBe(
      'started_at,completed_at,template_name,kind,status,theme,sections_total,sections_completed,seconds,mood',
    )
  })
})

describe('exportMarkdown', () => {
  it('includes the main sections and a session row', () => {
    const md = exportMarkdown(data)
    expect(md).toContain('# Guitar Trainer export')
    expect(md).toContain('## One thing to fix this week')
    expect(md).toContain('Keep time on the last bar.')
    expect(md).toContain('### Daily 60 (built-in)')
    expect(md).toContain('- Warm-up — 5 min')
    expect(md).toContain('### My drill, with comma')
    expect(md).toContain('### Picking drill (timed · difficulty 3)')
    expect(md).toContain('| 2026-11-25 | Daily 60 | full | energized |')
    expect(md).toContain('Week 2026-11-17 · streak 7')
  })
})

describe('parseTemplatesFromMarkdown', () => {
  it('round-trips the templates from our own export', () => {
    const parsed = parseTemplatesFromMarkdown(exportMarkdown(data))
    expect(parsed).toEqual([
      { name: 'Daily 60', isBuiltin: true, sections: [{ name: 'Warm-up', minutes: 5 }, { name: 'Technique', minutes: 12 }] },
      { name: 'My drill, with comma', isBuiltin: false, sections: [{ name: 'Focus', minutes: 10 }] },
    ])
  })

  it('returns an empty list for a file without a templates section', () => {
    expect(parseTemplatesFromMarkdown('# Notes\nJust some practice notes.')).toEqual([])
  })

  it('skips malformed section lines', () => {
    const parsed = parseTemplatesFromMarkdown(
      '## Templates\n### Solo\n- Warm-up — 5 min\n- not a section line\n- Focus — ten min\n',
    )
    expect(parsed).toEqual([
      { name: 'Solo', isBuiltin: false, sections: [{ name: 'Warm-up', minutes: 5 }] },
    ])
  })
})
