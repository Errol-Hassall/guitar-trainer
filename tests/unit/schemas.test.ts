import { describe, expect, it } from 'vitest'
import {
  completeSectionSchema,
  createRecordingSchema,
  createTrackSchema,
  exerciseInputSchema,
  importExercisesSchema,
  logEarRoundSchema,
  learningPathIdSchema,
  listSessionsSchema,
  logProgressSchema,
  restoreBackupSchema,
  savePresetSchema,
  saveWeeklyReviewSchema,
  setMoodSchema,
  setReferenceSchema,
  startSessionSchema,
  templateInputSchema,
  toggleStepCompletionSchema,
} from '#/server/schemas'

describe('savePresetSchema', () => {
  const valid = {
    name: 'Test preset',
    bpm: 90,
    beats: 4,
    beatUnit: 4,
    subdivision: 'none',
    accents: [2, 0, 0, 0],
  }

  it('accepts a valid preset and keeps numeric beat units', () => {
    const result = savePresetSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.beatUnit).toBe(4)
  })

  it('rejects an accent pattern whose length differs from the beats', () => {
    const result = savePresetSchema.safeParse({ ...valid, accents: [2, 0] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('accents'))).toBe(true)
    }
  })

  it('rejects out-of-range BPM and empty names', () => {
    expect(savePresetSchema.safeParse({ ...valid, bpm: 0 }).success).toBe(false)
    expect(savePresetSchema.safeParse({ ...valid, bpm: 1000 }).success).toBe(false)
    expect(savePresetSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false)
  })

  it('rejects unknown beat units and subdivisions', () => {
    expect(savePresetSchema.safeParse({ ...valid, beatUnit: 3 }).success).toBe(false)
    expect(savePresetSchema.safeParse({ ...valid, subdivision: 'dotted' }).success).toBe(false)
  })
})

describe('templateInputSchema', () => {
  it('requires at least one named section', () => {
    expect(templateInputSchema.safeParse({ name: 'T', sections: [] }).success).toBe(false)
    expect(
      templateInputSchema.safeParse({ name: 'T', sections: [{ name: '  ', minutes: 5 }] }).success,
    ).toBe(false)
  })

  it('bounds section count and minutes', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => ({ name: `s${i}`, minutes: 5 }))
    expect(templateInputSchema.safeParse({ name: 'T', sections: twelve }).success).toBe(true)
    expect(
      templateInputSchema.safeParse({ name: 'T', sections: [...twelve, { name: 'x', minutes: 5 }] })
        .success,
    ).toBe(false)
    expect(
      templateInputSchema.safeParse({ name: 'T', sections: [{ name: 's', minutes: 0 }] }).success,
    ).toBe(false)
    expect(
      templateInputSchema.safeParse({ name: 'T', sections: [{ name: 's', minutes: 181 }] })
        .success,
    ).toBe(false)
  })
})

describe('startSessionSchema', () => {
  it('only accepts known themes', () => {
    expect(
      startSessionSchema.safeParse({ templateId: 1, kind: 'full', theme: 'Picking & Pulse' })
        .success,
    ).toBe(true)
    expect(
      startSessionSchema.safeParse({ templateId: 1, kind: 'full', theme: 'Freeform' }).success,
    ).toBe(false)
    expect(startSessionSchema.safeParse({ templateId: 1, kind: 'rest', theme: 'Picking & Pulse' })
      .success).toBe(false)
  })
})

describe('listSessionsSchema', () => {
  it('defaults the limit to 50 and caps it at 100', () => {
    expect(listSessionsSchema.parse({}).limit).toBe(50)
    expect(listSessionsSchema.parse({ limit: 10 }).limit).toBe(10)
    expect(listSessionsSchema.safeParse({ limit: 101 }).success).toBe(false)
  })
})

describe('completeSectionSchema', () => {
  it('bounds elapsed seconds', () => {
    expect(completeSectionSchema.safeParse({ sectionId: 1, elapsedSeconds: -1 }).success).toBe(
      false,
    )
    expect(completeSectionSchema.safeParse({ sectionId: 1, elapsedSeconds: 86_401 }).success).toBe(
      false,
    )
    expect(completeSectionSchema.safeParse({ sectionId: 1, elapsedSeconds: 300 }).success).toBe(
      true,
    )
  })
})

describe('exerciseInputSchema', () => {
  const valid = {
    name: 'Picking drill',
    hasTiming: true,
    difficulty: 3,
    tags: ['Technique'],
    tabText: '',
  }

  it('accepts a valid exercise and trims the name', () => {
    const result = exerciseInputSchema.safeParse({ ...valid, name: '  Picking drill  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Picking drill')
  })

  it('rejects empty names, out-of-range difficulty and too many tags', () => {
    expect(exerciseInputSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false)
    expect(exerciseInputSchema.safeParse({ ...valid, difficulty: 0 }).success).toBe(false)
    expect(exerciseInputSchema.safeParse({ ...valid, difficulty: 6 }).success).toBe(false)
    const nineTags = Array.from({ length: 9 }, (_, index) => `tag${index}`)
    expect(exerciseInputSchema.safeParse({ ...valid, tags: nineTags }).success).toBe(false)
    expect(exerciseInputSchema.safeParse({ ...valid, tags: [''] }).success).toBe(false)
  })
})

describe('logProgressSchema', () => {
  it('defaults duration and notes', () => {
    const parsed = logProgressSchema.parse({ exerciseId: 1, maxCleanBpm: 120 })
    expect(parsed.durationSeconds).toBe(0)
    expect(parsed.notes).toBe('')
  })

  it('bounds BPM values to the metronome range', () => {
    expect(logProgressSchema.safeParse({ exerciseId: 1, maxCleanBpm: 0 }).success).toBe(false)
    expect(logProgressSchema.safeParse({ exerciseId: 1, maxCleanBpm: 1000 }).success).toBe(
      false,
    )
    expect(logProgressSchema.safeParse({ exerciseId: 1, maxCleanBpm: 999 }).success).toBe(true)
  })

  it('bounds self rating and duration', () => {
    expect(logProgressSchema.safeParse({ exerciseId: 1, selfRating: 0 }).success).toBe(false)
    expect(logProgressSchema.safeParse({ exerciseId: 1, selfRating: 6 }).success).toBe(false)
    expect(logProgressSchema.safeParse({ exerciseId: 1, durationSeconds: -1 }).success).toBe(
      false,
    )
  })
})

describe('setMoodSchema', () => {
  it('accepts the three moods and rejects anything else', () => {
    for (const mood of ['energized', 'neutral', 'drained']) {
      expect(setMoodSchema.safeParse({ id: 1, mood }).success).toBe(true)
    }
    expect(setMoodSchema.safeParse({ id: 1, mood: 'exhausted' }).success).toBe(false)
    expect(setMoodSchema.safeParse({ mood: 'neutral' }).success).toBe(false)
  })
})

describe('saveWeeklyReviewSchema', () => {
  const valid = {
    weekStart: '2026-11-23',
    practicedEveryday: true,
    streakCount: 7,
    improved: 'Cleaner picking.',
    focus: 'Slurs under the click.',
  }

  it('accepts a valid review', () => {
    expect(saveWeeklyReviewSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects bad week keys, negative streaks and oversized notes', () => {
    expect(
      saveWeeklyReviewSchema.safeParse({ ...valid, weekStart: '23/11/2026' }).success,
    ).toBe(false)
    expect(saveWeeklyReviewSchema.safeParse({ ...valid, streakCount: -1 }).success).toBe(false)
    expect(
      saveWeeklyReviewSchema.safeParse({ ...valid, focus: 'x'.repeat(4001) }).success,
    ).toBe(false)
  })
})

describe('restoreBackupSchema', () => {
  const emptyBackup = {
    version: 1,
    exportedAt: '2026-11-25T10:00:00.000Z',
    oneThing: '',
    templates: [],
    exercises: [],
    exerciseProgress: [],
    presets: [],
    sessions: [],
    weeklyReviews: [],
  }

  it('accepts an empty version-1 backup', () => {
    expect(restoreBackupSchema.safeParse(emptyBackup).success).toBe(true)
  })

  it('rejects unknown versions and broken rows', () => {
    expect(restoreBackupSchema.safeParse({ ...emptyBackup, version: 2 }).success).toBe(false)
    const badTemplate = {
      ...emptyBackup,
      templates: [
        { id: 1, slug: null, name: 'X', isBuiltin: false, sections: [{ name: 'S', minutes: 0 }] },
      ],
    }
    expect(restoreBackupSchema.safeParse(badTemplate).success).toBe(false)
    const badSession = {
      ...emptyBackup,
      sessions: [
        {
          id: 1,
          templateId: null,
          templateName: 'Rest day',
          theme: 'Picking & Pulse',
          kind: 'rest',
          autoAdvance: true,
          status: 'completed',
          startedAt: '2026-11-25T09:00:00.000Z',
          completedAt: null,
          mood: 'weird',
          sections: [],
        },
      ],
    }
    expect(restoreBackupSchema.safeParse(badSession).success).toBe(false)
  })
})

describe('createRecordingSchema', () => {
  const valid = {
    name: 'Take 1',
    mime: 'audio/webm;codecs=opus',
    dataB64: 'SGVsbG8=',
    durationSeconds: 5,
  }

  it('accepts a valid recording with optional tags', () => {
    expect(createRecordingSchema.safeParse(valid).success).toBe(true)
    expect(
      createRecordingSchema.safeParse({ ...valid, sessionId: 1, exerciseId: 2 }).success,
    ).toBe(true)
  })

  it('rejects empty names, bad base64 and oversized payloads', () => {
    expect(createRecordingSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false)
    expect(
      createRecordingSchema.safeParse({ ...valid, dataB64: 'not!base64' }).success,
    ).toBe(false)
    expect(
      createRecordingSchema.safeParse({ ...valid, dataB64: 'A'.repeat(20_000_001) })
        .success,
    ).toBe(false)
  })

  it('rejects negative or fractional durations', () => {
    expect(createRecordingSchema.safeParse({ ...valid, durationSeconds: -1 }).success).toBe(
      false,
    )
    expect(createRecordingSchema.safeParse({ ...valid, durationSeconds: 1.5 }).success).toBe(
      false,
    )
  })
})

describe('createTrackSchema', () => {
  it('accepts a file-backed track', () => {
    expect(
      createTrackSchema.safeParse({
        name: 'Riff',
        source: 'file',
        dataB64: 'SGVsbG8=',
        mime: 'audio/mpeg',
      }).success,
    ).toBe(true)
  })

  it('accepts a URL-backed track', () => {
    expect(
      createTrackSchema.safeParse({
        name: 'Demo',
        source: 'url',
        url: 'https://example.com/track.mp3',
      }).success,
    ).toBe(true)
  })

  it('rejects a file track without data and a URL track with a bad scheme', () => {
    expect(
      createTrackSchema.safeParse({ name: 'Riff', source: 'file' }).success,
    ).toBe(false)
    expect(
      createTrackSchema.safeParse({ name: 'Demo', source: 'url', url: 'ftp://example.com/a' })
        .success,
    ).toBe(false)
  })
})

describe('setReferenceSchema', () => {
  it('requires both a recording and an exercise id', () => {
    expect(setReferenceSchema.safeParse({ recordingId: 1, exerciseId: 2 }).success).toBe(true)
    expect(setReferenceSchema.safeParse({ recordingId: 1 }).success).toBe(false)
    expect(setReferenceSchema.safeParse({ exerciseId: 2 }).success).toBe(false)
  })
})

describe('learningPathIdSchema', () => {
  it('requires a positive integer id', () => {
    expect(learningPathIdSchema.safeParse({ id: 3 }).success).toBe(true)
    expect(learningPathIdSchema.safeParse({}).success).toBe(false)
    expect(learningPathIdSchema.safeParse({ id: 0 }).success).toBe(false)
  })
})

describe('toggleStepCompletionSchema', () => {
  it('requires a step id and a boolean flag', () => {
    expect(toggleStepCompletionSchema.safeParse({ stepId: 4, completed: true }).success).toBe(true)
    expect(toggleStepCompletionSchema.safeParse({ stepId: 4 }).success).toBe(false)
    expect(toggleStepCompletionSchema.safeParse({ completed: true }).success).toBe(false)
    expect(toggleStepCompletionSchema.safeParse({ stepId: -1, completed: true }).success).toBe(false)
  })
})

describe('importExercisesSchema', () => {
  it('requires a non-empty markdown body with a size cap', () => {
    expect(importExercisesSchema.safeParse({ markdown: '## Exercises\n' }).success).toBe(true)
    expect(importExercisesSchema.safeParse({ markdown: '' }).success).toBe(false)
    expect(
      importExercisesSchema.safeParse({ markdown: 'x'.repeat(200_001) }).success,
    ).toBe(false)
  })
})

describe('logEarRoundSchema', () => {
  it('accepts a known drill with a plausible score', () => {
    expect(
      logEarRoundSchema.safeParse({ drill: 'intervals', level: 1, correct: 8, total: 10 }).success,
    ).toBe(true)
    expect(
      logEarRoundSchema.safeParse({ drill: 'chord-quality', level: 2, correct: 0, total: 10 }).success,
    ).toBe(true)
  })

  it('rejects unknown drills, out-of-range levels and impossible scores', () => {
    expect(
      logEarRoundSchema.safeParse({ drill: 'rhythm-games', level: 1, correct: 1, total: 2 }).success,
    ).toBe(false)
    expect(
      logEarRoundSchema.safeParse({ drill: 'intervals', level: 3, correct: 1, total: 2 }).success,
    ).toBe(false)
    expect(
      logEarRoundSchema.safeParse({ drill: 'intervals', level: 0, correct: 1, total: 2 }).success,
    ).toBe(false)
    expect(
      logEarRoundSchema.safeParse({ drill: 'intervals', level: 1, correct: 3, total: 2 }).success,
    ).toBe(false)
    expect(logEarRoundSchema.safeParse({ drill: 'intervals', level: 1, correct: 1 }).success).toBe(
      false,
    )
  })
})
