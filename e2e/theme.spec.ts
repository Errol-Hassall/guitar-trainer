import { expect, test } from '@playwright/test'

test.describe('theme', () => {
  test('toggles to light and keeps the choice across reloads', async ({ page }) => {
    await page.goto('/')

    // Dark is the default: no data-theme attribute on <html>.
    const toggle = page.getByRole('button', { name: 'Switch to light theme' })
    await expect(toggle).toBeVisible()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme')

    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(
      page.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeVisible()

    // The choice survives a reload (restored by the pre-paint script).
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    // And can be switched back.
    await page.getByRole('button', { name: 'Switch to dark theme' }).click()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme')
  })
})
