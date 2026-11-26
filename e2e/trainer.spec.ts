import { expect, test } from '@playwright/test'

test.describe('rhythm trainer', () => {
  test('scores taps against the click and saves a run', async ({ page }) => {
    await page.goto('/trainer')

    await expect(page.locator('[data-trainer-state]')).toHaveAttribute(
      'data-trainer-state',
      'stopped',
    )
    await page.locator('[data-trainer-toggle]').click()
    await expect(page.locator('[data-trainer-state]')).toHaveAttribute(
      'data-trainer-state',
      'playing',
    )

    // Taps during the count-in are scored too.
    const tap = page.locator('[data-trainer-tap]')
    for (let i = 0; i < 6; i += 1) {
      await tap.click()
      await expect(page.locator('[data-last-hit]')).not.toBeEmpty()
      await page.waitForTimeout(120)
    }
    await expect(page.locator('[data-trainer-hits]')).toHaveText('6')
    await expect(page.locator('[data-onbeat-pct]')).toHaveText(/^\d+(\.\d)?%$/)
    await expect(page.locator('[data-advice]')).not.toBeEmpty()

    // Saving the run lists it under recent runs.
    await page.locator('[data-trainer-save]').click()
    await expect(page.locator('[data-runs-list] li').first()).toContainText('on beat')

    await page.locator('[data-trainer-toggle]').click()
    await expect(page.locator('[data-trainer-state]')).toHaveAttribute(
      'data-trainer-state',
      'stopped',
    )
  })

  test('resets the run when the tempo changes', async ({ page }) => {
    await page.goto('/trainer')

    await page.locator('[data-trainer-toggle]').click()
    await expect(page.locator('[data-trainer-state]')).toHaveAttribute(
      'data-trainer-state',
      'playing',
    )
    const tap = page.locator('[data-trainer-tap]')
    await tap.click()
    await page.waitForTimeout(150)
    await tap.click()
    await expect(page.locator('[data-trainer-hits]')).toHaveText('2')

    await page.locator('#trainer-bpm').fill('110')
    await expect(page.locator('[data-trainer-hits]')).toHaveText('0')

    await page.locator('[data-trainer-toggle]').click()
  })
})
