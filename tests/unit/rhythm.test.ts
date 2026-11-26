import { describe, expect, it } from 'vitest'
import { onBeatWindowMs, scoreTaps } from '#/lib/rhythm'

describe('onBeatWindowMs', () => {
  it('is 10% of the beat length, capped at 50 ms', () => {
    expect(onBeatWindowMs(90)).toBe(50) // 66.7 ms capped
    expect(onBeatWindowMs(120)).toBe(50)
    expect(onBeatWindowMs(240)).toBe(25)
  })
})

describe('scoreTaps', () => {
  it('scores an empty run as a prompt to keep tapping', () => {
    const score = scoreTaps([], 90)
    expect(score.hits).toBe(0)
    expect(score.onBeatPct).toBe(0)
    expect(score.advice).toBe('Keep tapping — a few more beats for a score.')
  })

  it('scores tight taps as locked in', () => {
    const score = scoreTaps([0, -10, 10, 0], 90)
    expect(score.hits).toBe(4)
    expect(score.onBeatPct).toBe(100)
    expect(score.averageMs).toBe(0)
    expect(score.consistencyMs).toBe(7.1)
    expect(score.advice).toBe('Locked in — try raising the BPM.')
  })

  it('flags a consistent late bias before anything else', () => {
    const score = scoreTaps([40, 45, 50, 42], 90)
    expect(score.averageMs).toBe(44.3)
    expect(score.advice).toBe('You are consistently late — aim slightly ahead of the click.')
  })

  it('flags a consistent early bias', () => {
    const score = scoreTaps([-40, -45, -50, -42], 90)
    expect(score.averageMs).toBe(-44.2) // Math.round ties toward +∞
    expect(score.advice).toBe(
      'You are consistently early — let the click land before you tap.',
    )
  })

  it('flags an unbiased but unsteady run', () => {
    const score = scoreTaps([-60, 60, -55, 55], 90)
    expect(score.averageMs).toBe(0)
    expect(score.consistencyMs).toBe(57.6)
    expect(score.advice).toBe(
      'Average is right but not steady yet — drop the BPM and focus on steadiness.',
    )
  })

  it('flags a steady run that mostly misses the window at fast tempos', () => {
    // Window at 240 BPM is 25 ms, so ±30 ms taps are all off-beat.
    const score = scoreTaps([-30, 30, -30, 30], 240)
    expect(score.onBeatPct).toBe(0)
    expect(score.consistencyMs).toBe(30)
    expect(score.advice).toBe('Getting there — stay at this tempo and chase the click.')
  })

  it('needs at least four taps before giving real advice', () => {
    const score = scoreTaps([0, 0], 90)
    expect(score.hits).toBe(2)
    expect(score.advice).toBe('Keep tapping — a few more beats for a score.')
  })
})
