import { expect, test } from '@playwright/test'

test.describe('keys', () => {
  test('shows the major signature and diatonic chords', async ({ page }) => {
    await page.goto('/keys')
    await expect(page.getByRole('heading', { name: 'Keys' })).toBeVisible()
    const board = page.locator('[data-key-mode]')
    await expect(board).toHaveAttribute('data-key-root', '0')
    await expect(board).toHaveAttribute('data-key-mode', 'major')

    // C major: no accidentals, relative minor A.
    await expect(page.getByText('no sharps or flats')).toBeVisible()
    await expect(page.getByText(/Relative minor: A/)).toBeVisible()
    await expect(page.locator('[data-roman="I"]')).toContainText('C')
  })

  test('minor keys show their own signature and lowercase-i chord set', async ({ page }) => {
    await page.goto('/keys')
    await page.getByLabel('Key').selectOption('11') // B minor: D major's 2 sharps
    await page.getByRole('button', { name: 'Minor' }).click()

    const board = page.locator('[data-key-mode]')
    await expect(board).toHaveAttribute('data-key-mode', 'minor')
    await expect(page.getByText('2 sharps (F C)')).toBeVisible()
    await expect(page.getByText(/Relative major: D/)).toBeVisible()

    // Natural-minor set: i B, III D — uppercase III has no major-mode twin.
    await expect(page.locator('[data-roman="i"]')).toContainText('B')
    await expect(page.locator('[data-roman="III"]')).toContainText('D')

    // Edge case: flat-side minor (D minor = F major, 1 flat).
    await page.getByLabel('Key').selectOption('2')
    await expect(page.getByText('1 flat (B)')).toBeVisible()
  })
})
