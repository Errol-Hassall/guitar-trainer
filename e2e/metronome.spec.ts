import { expect, test } from '@playwright/test'

test.describe('metronome', () => {
  test('shows the panel with default settings', async ({ page }) => {
    await page.goto('/metronome')

    const panel = page.locator('[data-metronome-panel]')
    await expect(panel).toBeVisible()
    await expect(panel).toHaveAttribute('data-bpm', '90')
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'stopped',
    )
  })

  test('changes tempo and beats per bar', async ({ page }) => {
    await page.goto('/metronome')

    await page.locator('#bpm-input').fill('120')
    await expect(page.locator('[data-metronome-panel]')).toHaveAttribute('data-bpm', '120')

    await page.locator('#beats-input').fill('3')
    await expect(
      page.locator('[data-accent-grid] button'),
    ).toHaveCount(3)
  })

  test('starts and stops the click', async ({ page }) => {
    await page.goto('/metronome')

    // No count-in so the metronome plays immediately.
    await page.locator('#count-in').selectOption('0')
    await page.locator('[data-metronome-toggle]').click()
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'playing',
    )

    await page.locator('[data-metronome-toggle]').click()
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'stopped',
    )
  })

  test('keeps running while you navigate, with a live nav indicator', async ({ page }) => {
    await page.goto('/metronome')

    // No count-in so the metronome plays immediately.
    await page.locator('#count-in').selectOption('0')
    await page.locator('[data-metronome-toggle]').click()
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'playing',
    )

    // The nav bar shows the live indicator with the current tempo.
    const indicator = page.locator('[data-metronome-indicator]')
    await expect(indicator).toBeVisible()
    await expect(indicator).toHaveText('90 BPM')

    // In-app navigation keeps the click running.
    await page.getByRole('link', { name: 'Home', exact: true }).click()
    await expect(page.locator('[data-metronome-indicator]')).toHaveText('90 BPM')

    // The indicator links back to the still-playing metronome.
    await page.locator('[data-metronome-indicator]').click()
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'playing',
    )

    // Stopping clears the indicator.
    await page.locator('[data-metronome-toggle]').click()
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'stopped',
    )
    await expect(page.locator('[data-metronome-indicator]')).toHaveCount(0)
  })

  test('applies named rhythm patterns', async ({ page }) => {
    await page.goto('/metronome')

    const grid = page.locator('[data-accent-grid] button')
    await expect(page.locator('[data-pattern-grid] button')).toHaveCount(3)

    // Waltz: 3/4 with a dominant downbeat.
    await page.locator('[data-pattern="waltz"]').click()
    await expect(page.locator('#beats-input')).toHaveValue('3')
    await expect(grid).toHaveCount(3)
    await expect(grid.nth(0)).toContainText('Dominant')

    // Gallop and shuffle are mirror-image subdivisions.
    await page.locator('[data-pattern="gallop"]').click()
    await expect(page.locator('#subdivision')).toHaveValue('gallop')
    await page.locator('[data-pattern="shuffle"]').click()
    await expect(page.locator('#subdivision')).toHaveValue('swing')
  })

  test('rest beats count but do not play', async ({ page }) => {
    // Count every click the Web Audio graph actually schedules.
    await page.addInitScript(() => {
      let clicks = 0
      const bump = () => {
        ;(window as unknown as { __clicks: number }).__clicks = ++clicks
      }
      const oscillator = window.AudioContext.prototype.createOscillator
      window.AudioContext.prototype.createOscillator = function (this: AudioContext) {
        bump()
        return oscillator.call(this)
      }
      const bufferSource = window.AudioContext.prototype.createBufferSource
      window.AudioContext.prototype.createBufferSource = function (this: AudioContext) {
        bump()
        return bufferSource.call(this)
      }
    })
    await page.goto('/metronome')

    const readClicks = () =>
      page.evaluate(() => (window as unknown as { __clicks: number }).__clicks)
    const grid = page.locator('[data-accent-grid] button')

    // Control: the default pattern does produce clicks in this browser.
    await page.locator('#count-in').selectOption('0')
    await page.locator('[data-metronome-toggle]').click()
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'playing',
    )
    await page.waitForTimeout(1200)
    expect(await readClicks()).toBeGreaterThan(0)
    await page.locator('[data-metronome-toggle]').click()
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'stopped',
    )
    const clicksBefore = await readClicks()

    // Turn every beat into a rest (count, don't play).
    await grid.nth(0).click() // dominant → rest
    for (let i = 1; i < 4; i += 1) {
      await grid.nth(i).click()
      await grid.nth(i).click()
      await grid.nth(i).click()
    }
    await expect(grid.nth(0)).toContainText('Rest')

    // It keeps counting (state stays playing) but schedules no new clicks.
    await page.locator('[data-metronome-toggle]').click()
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'playing',
    )
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'playing',
    )
    expect(await readClicks()).toBe(clicksBefore)

    await page.locator('[data-metronome-toggle]').click()
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'stopped',
    )
  })

  test('stops itself after the requested number of bars', async ({ page }) => {
    await page.goto('/metronome')

    await page.locator('#count-in').selectOption('0')
    await page.locator('#stop-after-input').fill('1')
    await page.locator('[data-metronome-toggle]').click()

    // One bar at 90 BPM in 4/4 takes ~2.7s; the metronome stops itself.
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'stopped',
      { timeout: 8000 },
    )
  })

  test('saves and deletes a preset', async ({ page }) => {
    await page.goto('/metronome')

    await page.locator('#preset-name').fill('E2E preset')
    await page.getByRole('button', { name: 'Save current settings' }).click()

    await expect(page.getByText('Preset saved.')).toBeVisible()
    await expect(page.locator('li', { hasText: 'E2E preset' })).toBeVisible()

    await page.getByRole('button', { name: 'Delete preset E2E preset' }).click()
    await expect(page.locator('li', { hasText: 'E2E preset' })).toHaveCount(0)
  })
})
