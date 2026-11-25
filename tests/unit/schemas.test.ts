import { describe, expect, it } from 'vitest'
import {
  completeSectionSchema,
  listSessionsSchema,
  savePresetSchema,
  startSessionSchema,
  templateInputSchema,
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
