import { expect, test } from '@playwright/test'

test.describe('arpeggios', () => {
  test('maps chord tones to the neck and follows chord changes', async ({ page }) => {
    await page.goto('/arpeggios')
    await expect(page.getByRole('heading', { name: 'Arpeggios' })).toBeVisible()
    const board = page.locator('div[data-chord-name]')
    await expect(board).toHaveAttribute('data-chord-name', 'C')
    // C triad in the default window (frets 0–7).
    await expect(page.locator('[data-window-count]')).toHaveAttribute('data-window-count', '12')
    await expect(page.getByRole('img', { name: 'C chord tones on the fretboard' })).toBeVisible()

    // Am holds one more note in the same window.
    await page.getByLabel('Chord', { exact: true }).selectOption('Am')
    await expect(board).toHaveAttribute('data-chord-name', 'Am')
    await expect(page.locator('[data-window-count]')).toHaveAttribute('data-window-count', '13')
  })

  test('practice window counts and plays chord tones', async ({ page }) => {
    await page.goto('/arpeggios')
    await page.getByLabel('From fret').fill('1')
    await page.getByLabel('To fret').fill('3')
    await expect(page.locator('[data-window-count]')).toHaveAttribute('data-window-count', '5')

    const play = page.locator('[data-practice-play]')
    await play.click()
    await expect(play).toBeDisabled()
    await expect(play).toBeEnabled({ timeout: 30_000 })
    await expect(page.getByText('Audio is not available')).toHaveCount(0)
  })
})
