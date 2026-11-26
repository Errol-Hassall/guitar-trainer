import { expect, test, type Page } from '@playwright/test'
import { createExercise } from './helpers'

/**
 * Patch getUserMedia to return a 440 Hz sine wave (A4) so the tuner and
 * MediaRecorder tests run without a physical microphone.
 */
async function useFakeMic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const context = new AudioContext()
      if (context.state === 'suspended') void context.resume()
      const oscillator = context.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.value = 440
      const destination = context.createMediaStreamDestination()
      oscillator.connect(destination)
      oscillator.start()
      return destination.stream
    }
  })
}

/** Build a minimal PCM WAV file (mono, 16-bit). */
function makeWav(frequency: number, seconds: number, sampleRate: number): Buffer {
  const samples = Math.floor(sampleRate * seconds)
  const buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i += 1) {
    buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 12000), 44 + i * 2)
  }
  return buffer
}

test.describe('audio tools', () => {
  test('tuner detects A4 from the mic', async ({ page }) => {
    await useFakeMic(page)
    await page.goto('/tuner')

    await expect(page.locator('[data-tuner-state]')).toHaveAttribute('data-tuner-state', 'idle')
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.locator('[data-tuner-state]')).toHaveAttribute('data-tuner-state', 'listening')

    const note = page.locator('[data-tuner-note]')
    await expect(note).toHaveAttribute('data-tuner-note', 'A4')

    await page.getByRole('button', { name: 'Stop' }).click()
    await expect(page.locator('[data-tuner-state]')).toHaveAttribute('data-tuner-state', 'idle')
  })

  test('tunes against a target note with flat/in-tune feedback and string presets', async ({ page }) => {
    await useFakeMic(page)
    await page.goto('/tuner')
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.locator('[data-tuner-state]')).toHaveAttribute('data-tuner-state', 'listening')

    const display = page.locator('[data-tuner-note]')
    // The fake mic plays A4. Targeting A# (a semitone higher) reads flat, ~−100¢.
    await page.getByLabel('Target note').selectOption({ label: 'A#4' })
    await expect(display).toHaveAttribute('data-tuner-status', 'flat')
    await expect(display).toHaveAttribute('data-tuner-target-cents', /^-?(9[5-9]|10[0-5])$/)

    // Targeting the same pitch class two octaves lower folds to in tune:
    // octave lock-ons must not read as ±2400¢.
    await page.getByLabel('Target note').selectOption({ label: 'A2' })
    await expect(display).toHaveAttribute('data-tuner-status', 'in-tune')
    await expect(display).toHaveAttribute('data-tuner-target-cents', /^-?(0|[1-9]|10)$/)

    // The standard-tuning preset buttons drive the target select.
    await page.getByRole('button', { name: '5 · A2' }).click()
    await expect(page.getByLabel('Target note')).toHaveValue('A2')
    await expect(page.getByRole('button', { name: '5 · A2' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Stop' }).click()
    await expect(page.locator('[data-tuner-state]')).toHaveAttribute('data-tuner-state', 'idle')
  })

  test('records a take, tags it to an exercise and sets it as the reference', async ({ page }) => {
    await useFakeMic(page)
    await createExercise(page, 'Bend drill')
    const exerciseUrl = page.url()

    await page.goto('/recordings')
    await page.getByLabel('Exercise').selectOption({ label: 'Bend drill' })

    await page.getByRole('button', { name: 'Record' }).click()
    await expect(page.getByRole('button', { name: /Stop/ })).toBeVisible()
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: /Stop/ }).click()

    const list = page.locator('[data-recording-count]')
    await expect(list).toHaveAttribute('data-recording-count', '1')
    const row = page.locator('[data-recording-id]').first()
    await expect(row).toContainText('Take 1')
    await expect(row).toContainText('Bend drill')

    // Set as the reference take for the exercise.
    await page.getByRole('button', { name: 'Set Take 1 as the reference take' }).click()
    await expect(row).toContainText('Reference')

    // The exercise detail page shows the reference chip.
    await page.goto(exerciseUrl)
    const chip = page.locator('section', { hasText: 'Reference take' })
    await expect(chip).toContainText('Take 1')
    await expect(chip.getByRole('link', { name: 'Open recordings' })).toBeVisible()
  })

  test('compares two takes back to back', async ({ page }) => {
    await useFakeMic(page)
    await page.goto('/recordings')

    // A second take so the compare bar appears (Take 1 exists from the previous test).
    await page.getByRole('button', { name: 'Record' }).click()
    await page.waitForTimeout(1200)
    await page.getByRole('button', { name: /Stop/ }).click()
    await expect(page.locator('[data-recording-count]')).toHaveAttribute('data-recording-count', '2')

    await page.getByLabel('Take A').selectOption({ label: 'Take 1' })
    await page.getByLabel('Take B').selectOption({ label: 'Take 2' })
    await page.getByRole('button', { name: 'Play A → B' }).click()

    const player = page.locator('[data-player-state]')
    await expect(player).toBeVisible()
    await expect
      .poll(async () => (await player.getAttribute('data-player-state')) ?? '')
      .toMatch(/^(ready|playing)$/)
  })

  test('uploads a wav track and plays it time-stretched at 150%', async ({ page }) => {
    await page.goto('/tracks')

    await page.setInputFiles('#track-file', {
      name: 'drill.wav',
      mimeType: 'audio/wav',
      buffer: makeWav(440, 2, 8000),
    })
    await expect(page.getByLabel('Name')).toHaveValue('drill')
    await page.getByRole('button', { name: 'Add track' }).click()

    const list = page.locator('[data-track-count]')
    await expect(list).toHaveAttribute('data-track-count', '1')

    await page.getByRole('button', { name: 'Load' }).click()
    const player = page.locator('[data-track-status]')
    await expect(player).toHaveAttribute('data-track-status', 'ready')

    // Stretch on play: tempo 150% must go through the WSOLA path.
    await page.locator('#track-tempo').fill('150')
    await expect(page.locator('#track-tempo')).toHaveAttribute('data-tempo', '150')
    await page.getByRole('button', { name: /Play/ }).click()
    await expect(player).toHaveAttribute('data-track-status', 'playing')
  })

  test('rejects non-http(s) track URLs', async ({ page }) => {
    await page.goto('/tracks')

    await page.getByRole('button', { name: 'URL' }).click()
    await page.getByLabel('Name').fill('Bad link')
    await page.locator('#track-url').fill('ftp://example.com/track.mp3')
    await page.getByRole('button', { name: 'Add track' }).click()

    await expect(page.locator('[role="alert"]')).toBeVisible()
    // The ftp URL must not have been stored.
    await expect(page.locator('[data-track-count]')).toHaveAttribute('data-track-count', '1')
  })
})
