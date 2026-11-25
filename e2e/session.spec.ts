import { expect, test } from '@playwright/test'
import { createSingleSectionTemplate, startTemplateSession } from './helpers'

test.describe('sessions', () => {
  test('runs a single-section session to completion', async ({ page }) => {
    await createSingleSectionTemplate(page, 'E2E one')
    await startTemplateSession(page, 'E2E one')

    const timer = page.locator('[data-session-status="active"]')
    await expect(timer).toBeVisible()
    await expect(page.locator('[data-current-section]')).toHaveAttribute(
      'data-current-section',
      '1',
    )
    await expect(page.locator('[data-timer-seconds]')).toHaveAttribute(
      'data-timer-seconds',
      '60',
    )

    // Turn off auto-advance so completion is deterministic.
    await page.getByLabel('Auto-advance').uncheck()

    await page.getByRole('button', { name: 'Skip section' }).click()

    // The only section completing the plan finishes the whole session.
    await expect(page.locator('[data-session-status="completed"]')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Session complete' }),
    ).toBeVisible()
  })

  test('shows the one-thing note at the top of a session', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Focus note').fill('Keep the low E clean.')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('[data-save-status="saved"]')).toBeVisible()

    await createSingleSectionTemplate(page, 'E2E notes')
    await startTemplateSession(page, 'E2E notes')

    await expect(page.locator('p', { hasText: 'Keep the low E clean.' })).toBeVisible()

    // End it so the next test can start its own session.
    await page.getByRole('button', { name: 'End session' }).click()
    await expect(page.locator('[data-session-status="completed"]')).toBeVisible()
  })

  test('logs a rest day from home', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /log a rest day/i }).click()

    await expect(page).toHaveURL(/\/sessions\/\d+/)
    await expect(page.locator('[data-session-status="completed"]')).toBeVisible()
  })

  test('lists completed sessions in history', async ({ page }) => {
    await createSingleSectionTemplate(page, 'E2E history')
    await startTemplateSession(page, 'E2E history')
    await page.getByRole('button', { name: 'Skip section' }).click()
    await expect(page.locator('[data-session-status="completed"]')).toBeVisible()

    await page.goto('/history')
    await expect(
      page.locator('li', { hasText: 'E2E history' }),
    ).toBeVisible()
  })
})
