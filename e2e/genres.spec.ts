import { expect, test } from '@playwright/test'

test.describe('genres', () => {
  test('lists the scales and modes of each genre', async ({ page }) => {
    await page.goto('/genres')

    const genreCard = (name: string) =>
      page.locator('section').filter({ has: page.getByRole('heading', { name, exact: true }) })

    const blues = genreCard('Blues')
    await expect(blues).toBeVisible()
    // Modes are derived from MODES.genres: Dorian and Mixolydian tag blues.
    await expect(blues.getByText('Dorian')).toBeVisible()
    await expect(blues.getByText('Mixolydian')).toBeVisible()
    await expect(blues.getByText('Minor pentatonic · Blues')).toBeVisible()

    // Country matches Ionian's "pop, country" tag.
    await expect(genreCard('Country').getByText('Ionian')).toBeVisible()
  })
})
