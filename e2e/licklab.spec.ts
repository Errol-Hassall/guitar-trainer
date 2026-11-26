import { expect, test } from '@playwright/test'

test.describe('LickLab', () => {
  test('generates a deterministic lick for a fixed seed', async ({ page }) => {
    await page.goto('/licklab')

    const notes = page.locator('[data-lick-note]')
    await expect(notes).toHaveCount(8)

    // Seed 42 in A minor pentatonic (blues) is pinned by the unit tests.
    await expect(page.locator('[data-lick-note="0"]')).toContainText('G3')
    await expect(page.locator('[data-lick-note="1"]')).toContainText('vibrato')

    // Changing other controls and coming back with the same seed reproduces it.
    await page.locator('#lick-scale').selectOption('blues')
    await page.locator('#lick-scale').selectOption('minor-pentatonic')
    await expect(page.locator('[data-lick-note="0"]')).toContainText('G3')
  })

  test('a different seed gives a different lick', async ({ page }) => {
    await page.goto('/licklab')

    const first = await page.locator('[data-lick-list]').innerText()
    await page.locator('#lick-seed').fill('7')
    // Seed 7 in A minor pentatonic starts on E2 (seed 42 starts on G3).
    await expect(page.locator('[data-lick-note="0"]')).toContainText('E2')
    expect(await page.locator('[data-lick-list]').innerText()).not.toBe(first)
  })

  test('copies the lick as text', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/licklab')

    await page.locator('[data-lick-copy]').click()
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()

    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toContain('A Minor pentatonic')
    expect(text).toContain('seed 42')
    expect(text).toContain('G3')
  })
})
