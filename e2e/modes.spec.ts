import { expect, test } from '@playwright/test'

test.describe('modes', () => {
  test('defaults to C Ionian with its character line and note chips', async ({ page }) => {
    await page.goto('/modes')
    await expect(page.getByRole('heading', { name: 'Modes' })).toBeVisible()
    const board = page.locator('[data-mode-id]')
    await expect(board).toHaveAttribute('data-mode-id', 'ionian')
    await expect(board).toHaveAttribute('data-root-pc', '0')
    await expect(page.getByText(/same notes as C major/)).toBeVisible()
    // Default window (frets 0–7) holds the same 30 notes as the C major scale.
    await expect(page.locator('[data-window-count]')).toHaveAttribute('data-window-count', '30')
  })

  test('switching mode and key changes the spelling and names the parent major', async ({ page }) => {
    await page.goto('/modes')
    await page.getByLabel('Mode', { exact: true }).selectOption('dorian')
    await page.getByLabel('Key').selectOption('4') // E Dorian

    const board = page.locator('[data-mode-id]')
    await expect(board).toHaveAttribute('data-mode-id', 'dorian')
    await expect(board).toHaveAttribute('data-root-pc', '4')
    // E Dorian is D major's notes: F# appears, the parent key is named.
    await expect(page.locator('[aria-label="Mode notes"] li', { hasText: /^F#$/ })).toBeVisible()
    await expect(page.getByText(/same notes as D major/)).toBeVisible()
    await expect(
      page.getByRole('img', { name: 'E Dorian on the fretboard' }),
    ).toBeVisible()
  })
})
