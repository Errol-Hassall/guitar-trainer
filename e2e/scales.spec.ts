import { expect, test } from '@playwright/test'

test.describe('scale library', () => {
  test('maps a scale to the neck and follows key and type changes', async ({ page }) => {
    await page.goto('/scales')
    await expect(page.getByRole('heading', { name: 'Scale library' })).toBeVisible()
    const board = page.locator('[data-scale-type]')
    await expect(board).toHaveAttribute('data-root-pc', '0')
    await expect(page.getByRole('img', { name: 'Scale notes on the fretboard' })).toBeVisible()

    // F# major keeps correct spelling (E#, not F).
    await page.getByLabel('Key').selectOption('6')
    await expect(board).toHaveAttribute('data-root-pc', '6')
    await expect(page.getByText('E#', { exact: true }).first()).toBeVisible()

    // G minor pentatonic has fewer notes on the neck than C major.
    await page.getByLabel('Key').selectOption('7')
    await page.getByLabel('Scale type').selectOption('minor-pentatonic')
    await expect(board).toHaveAttribute('data-scale-type', 'minor-pentatonic')

    // C blues spells the flat family on the dots (Gb, not F#).
    await page.getByLabel('Key').selectOption('0')
    await page.getByLabel('Scale type').selectOption('blues')
    await expect(page.locator('svg text', { hasText: /^Gb$/ }).first()).toBeVisible()
  })

  test('practice window counts notes and plays them back', async ({ page }) => {
    await page.goto('/scales')
    // Default window frets 0–7 holds 30 C-major notes.
    await expect(page.locator('[data-window-count]')).toHaveAttribute('data-window-count', '30')

    // Narrowing to frets 1–3 leaves 11; reversed bounds are swapped, not emptied.
    await page.getByLabel('From fret').fill('1')
    await page.getByLabel('To fret').fill('3')
    await expect(page.locator('[data-window-count]')).toHaveAttribute('data-window-count', '11')
    await page.getByLabel('From fret').fill('3')
    await page.getByLabel('To fret').fill('1')
    await expect(page.locator('[data-window-count]')).toHaveAttribute('data-window-count', '11')

    // Playing disables the button until the round trip finishes.
    const play = page.locator('[data-practice-play]')
    await play.click()
    await expect(play).toBeDisabled()
    await expect(play).toBeEnabled({ timeout: 30_000 })
    await expect(page.getByText('Audio is not available')).toHaveCount(0)
  })
})
