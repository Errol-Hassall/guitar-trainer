import { expect, test } from '@playwright/test'

test.describe('interval notebook', () => {
  test('lists the ten intervals and keeps a saved note across reloads', async ({ page }) => {
    await page.goto('/intervals')
    await expect(page.getByRole('heading', { name: 'Interval notebook' })).toBeVisible()

    // Ten intervals, none in the notebook yet.
    await expect(
      page.locator('section').filter({ hasText: 'semitones from the root' }),
    ).toHaveCount(10)
    await expect(page.getByText('In notebook')).toHaveCount(0)

    const fifth = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Perfect 5th', exact: true }) })
    await expect(fifth).toBeVisible()
    await expect(fifth.getByRole('button', { name: 'Play' })).toBeVisible()

    const input = fifth.getByLabel('Note for Perfect 5th', { exact: true })
    await input.fill('The backbone of open chords')
    await fifth.getByRole('button', { name: 'Save' }).click()
    await expect(fifth.getByText('In notebook')).toBeVisible()

    // The note survives a reload.
    await page.reload()
    await expect(
      page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: 'Perfect 5th', exact: true }) })
        .getByLabel('Note for Perfect 5th', { exact: true }),
    ).toHaveValue('The backbone of open chords')

    // Removing it drops the entry.
    const reloaded = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Perfect 5th', exact: true }) })
    await reloaded.getByRole('button', { name: 'Remove' }).click()
    await expect(reloaded.getByText('In notebook')).toBeHidden()
  })
})
