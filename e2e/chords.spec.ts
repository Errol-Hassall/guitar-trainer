import { expect, test } from '@playwright/test'

test.describe('chord library', () => {
  test('lists common chords with diagrams and filters by search', async ({ page }) => {
    await page.goto('/chords')
    await expect(page.getByRole('heading', { name: 'Chord library' })).toBeVisible()
    const grid = page.locator('[data-chord-count]')
    await expect(grid).toHaveAttribute('data-chord-count', '20')

    // Search narrows the grid (Am and Am7 match "am").
    await page.getByLabel('Search chords').fill('am')
    await expect(grid).toHaveAttribute('data-chord-count', '2')

    // Edge case: no match shows an empty state instead of a blank grid.
    await page.getByLabel('Search chords').fill('Zz9')
    await expect(page.locator('[data-chord-empty="true"]')).toBeVisible()
  })

  test('shows the diatonic chords of a key and jumps to their diagram', async ({ page }) => {
    await page.goto('/chords')
    const keyCard = page.locator('[data-key-root]')
    await expect(keyCard).toHaveAttribute('data-key-root', '0')

    // G major: V is D. Clicking the row loads its diagram via search.
    await page.getByLabel('Key').selectOption('7')
    await expect(keyCard).toHaveAttribute('data-key-root', '7')
    await expect(
      page.getByRole('button', { name: /V\s+D\s+Major/ }),
    ).toBeVisible()
    await page.getByRole('button', { name: /V\s+D\s+Major/ }).click()
    // The search now shows the D-family diagrams; the plain D chart is among them.
    await expect(page.locator('[data-chord-count]')).toHaveAttribute('data-chord-count', '3')
    await expect(page.getByRole('img', { name: 'D chord diagram' })).toBeVisible()

    // Edge case: sharp keys keep correct spelling (vii° of F# is E#).
    await page.getByLabel('Key').selectOption('6')
    await expect(page.getByText('E#', { exact: true })).toBeVisible()
  })

  test('copies an ASCII chart to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/chords')

    const cCard = page.locator('li').filter({ has: page.getByRole('img', { name: 'C chord diagram' }) })
    await cCard.getByRole('button', { name: 'Copy' }).click()
    await expect(cCard.getByRole('button', { name: 'Copied' })).toBeVisible()

    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text.split('\n')[0]).toBe('e|o--------')
    expect(text).toContain('D|--- 2----')
  })
})
