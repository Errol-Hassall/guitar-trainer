import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.describe('workflow', () => {
  test('shows a streak chip on home and counts a logged rest day', async ({ page }) => {
    await page.goto('/')
    const chip = page.getByText(/\d+-day streak/)
    await expect(chip).toBeVisible()

    // Rest days cover the day, so after logging one today the streak is at least 1.
    // (Other specs may already have logged a session today; exact counts are unit-tested.)
    await page.getByRole('button', { name: /log a rest day/i }).click()
    await expect(page.locator('[data-session-status="completed"]')).toBeVisible()

    await page.goto('/')
    const text = await page.getByText(/\d+-day streak/).innerText()
    expect(Number(text.match(/\d+/)?.[0])).toBeGreaterThanOrEqual(1)
  })

  test('lets you set a mood on a completed session and shows it on home', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /light session/i }).click()
    await expect(page).toHaveURL(/\/sessions\/\d+/)
    await page.getByRole('button', { name: 'End session' }).click()
    await expect(page.locator('[data-session-status="completed"]')).toBeVisible()

    await expect(page.getByRole('heading', { name: 'How are you feeling?' })).toBeVisible()
    await page.getByRole('button', { name: 'Energized' }).click()
    await expect(
      page.getByRole('button', { name: 'Energized' }),
    ).toHaveAttribute('aria-pressed', 'true')

    // The mood badge appears on the session row in recent sessions.
    await page.goto('/')
    await expect(page.locator('[data-session-mood]', { hasText: 'energized' })).toBeVisible()
  })

  test('saves a weekly review and pins the focus as the one thing', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Weekly review' }),
    ).toBeVisible()

    await page.getByLabel('One thing that improved').fill('E2E improved')
    await page.getByLabel('One thing to focus on next week').fill('E2E weekly focus')
    await page.getByRole('button', { name: 'Save review' }).click()

    await expect(page.getByText('Reviewed this week.')).toBeVisible()
    // The focus answer becomes the pinned one-thing note.
    await expect(page.getByLabel('Focus note')).toHaveValue('E2E weekly focus')
  })

  test('downloads a versioned JSON backup', async ({ page }) => {
    await page.goto('/data')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'JSON backup' }).click(),
    ])
    const parsed = JSON.parse(readFileSync(await download.path(), 'utf8')) as {
      version: number
      templates: unknown[]
    }
    expect(parsed.version).toBe(1)
    expect(Array.isArray(parsed.templates)).toBe(true)
  })

  test('rejects a markdown import without a templates section', async ({ page }) => {
    await page.goto('/data')
    await page
      .locator('#import-markdown')
      .setInputFiles({ name: 'notes.md', mimeType: 'text/markdown', buffer: Buffer.from('# Notes\nJust practice notes.\n') })
    await expect(page.getByText('No new templates found in that file.')).toBeVisible()
  })

  test('links the web app manifest', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/manifest.webmanifest',
    )
  })
})
