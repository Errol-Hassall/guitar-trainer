import { describe, expect, it } from 'vitest'
import { isStepUnlocked } from '#/lib/learning'

describe('isStepUnlocked', () => {
  it('unlocks a step with no prerequisite', () => {
    expect(isStepUnlocked(null, new Set())).toBe(true)
    expect(isStepUnlocked(null, new Set([1]))).toBe(true)
  })

  it('unlocks a step whose prerequisite is complete', () => {
    expect(isStepUnlocked(3, new Set([3]))).toBe(true)
    expect(isStepUnlocked(3, new Set([1, 3, 7]))).toBe(true)
  })

  it('keeps a step locked while its prerequisite is incomplete', () => {
    expect(isStepUnlocked(3, new Set())).toBe(false)
    expect(isStepUnlocked(3, new Set([1]))).toBe(false)
  })
})
