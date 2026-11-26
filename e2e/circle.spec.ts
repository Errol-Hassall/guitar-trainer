import { expect, test } from '@playwright/test'

test.describe('circle of fifths', () => {
  test('defaults to C major with its signature and triads', async ({ page }) => {
    await page.goto('/circle')
    await expect(page.getByRole('heading', { name: 'Circle of fifths' })).toBeVisible()
    const board = page.locator('[data-circle-selected]')
    await expect(board).toHaveAttribute('data-circle-selected', '0')
    await expect(page.getByText('no sharps or flats')).toBeVisible()
    await expect(page.getByRole('button', { name: 'C major, relative A minor' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('clicking a segment selects that key', async ({ page }) => {
    await page.goto('/circle')
    await page.getByRole('button', { name: 'G major, relative E minor' }).click()

    const board = page.locator('[data-circle-selected]')
    await expect(board).toHaveAttribute('data-circle-selected', '7')
    await expect(page.getByText('1 sharp (F)')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'G major' })).toBeVisible()
  })

  test('segments respond to the keyboard', async ({ page }) => {
    await page.goto('/circle')
    const segment = page.getByRole('button', { name: 'D major, relative B minor' })
    await segment.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-circle-selected]')).toHaveAttribute('data-circle-selected', '2')
    await expect(page.getByText('2 sharps (F C)')).toBeVisible()
  })
})
