import { expect, test, type Page } from '@playwright/test'

async function startDailySession(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: /Start full session/ }).click()
  await expect(page).toHaveURL(/\/sessions\/\d+/)
  await expect(page.locator('[data-session-status="active"]')).toBeVisible()
}

test.describe('hands-free control', () => {
  test('foot-pedal keys drive the timer, sections and tap tempo', async ({ page }) => {
    await startDailySession(page)

    // Multi-section template: uncheck auto-advance so "next" is deterministic.
    await page.getByLabel('Auto-advance').uncheck()
    // Blur the checkbox — keys are ignored while a form field has focus.
    await page.locator('[data-timer-seconds]').click()

    // Space starts and pauses the section timer.
    await page.keyboard.press('Space')
    await expect(page.locator('[data-timer-running="true"]')).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.locator('[data-timer-running="false"]')).toBeVisible()

    // N completes the section; Space then advances to the next one.
    await page.keyboard.press('n')
    await expect(page.getByRole('button', { name: 'Next section' })).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.locator('[data-current-section="2"]')).toBeVisible()

    // T taps the metronome tempo (three quick taps set a non-default BPM).
    await page.locator('[data-metronome-panel]').scrollIntoViewIfNeeded()
    await page.keyboard.press('t')
    await page.keyboard.press('t')
    await page.keyboard.press('t')
    await expect(page.locator('[data-metronome-panel]')).not.toHaveAttribute(
      'data-bpm',
      '90',
    )

    // Leave no active session for the next spec.
    await page.getByRole('button', { name: 'End session' }).click()
    await expect(page.locator('[data-session-status="completed"]')).toBeVisible()
  })

  test('voice control degrades gracefully without a microphone', async ({ page }) => {
    await startDailySession(page)

    const voice = page.locator('[data-voice-state]')
    await expect(voice).toHaveAttribute('data-voice-state', 'off')

    // Headless Chromium has no microphone: recognition must either be reported
    // unsupported or error out and switch itself off — never hang "on".
    await page.getByRole('button', { name: 'Enable voice control' }).click()
    await expect(
      async () => {
        const off = (await voice.getAttribute('data-voice-state')) === 'off'
        const alertVisible = await page.getByRole('alert').isVisible()
        if (!off && !alertVisible) throw new Error('voice control still enabling')
      },
    ).toPass({ timeout: 15_000 })

    await page.getByRole('button', { name: 'End session' }).click()
    await expect(page.locator('[data-session-status="completed"]')).toBeVisible()
  })

  test('home shows the suggested focus and an empty review list', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Suggested focus' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Due for review' })).toBeVisible()
    await expect(page.getByText(/Nothing due yet/)).toBeVisible()
  })
})
