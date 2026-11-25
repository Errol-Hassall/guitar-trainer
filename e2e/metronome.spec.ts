import { expect, test } from '@playwright/test'

test.describe('metronome', () => {
  test('shows the panel with default settings', async ({ page }) => {
    await page.goto('/metronome')

    const panel = page.locator('[data-metronome-panel]')
    await expect(panel).toBeVisible()
    await expect(panel).toHaveAttribute('data-bpm', '90')
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'stopped',
    )
  })

  test('changes tempo and beats per bar', async ({ page }) => {
    await page.goto('/metronome')

    await page.locator('#bpm-input').fill('120')
    await expect(page.locator('[data-metronome-panel]')).toHaveAttribute('data-bpm', '120')

    await page.locator('#beats-input').fill('3')
    await expect(
      page.locator('[data-accent-grid] button'),
    ).toHaveCount(3)
  })

  test('starts and stops the click', async ({ page }) => {
    await page.goto('/metronome')

    // No count-in so the metronome plays immediately.
    await page.locator('#count-in').selectOption('0')
    await page.locator('[data-metronome-toggle]').click()
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'playing',
    )

    await page.locator('[data-metronome-toggle]').click()
    await expect(page.locator('[data-metronome-state]')).toHaveAttribute(
      'data-metronome-state',
      'stopped',
    )
  })

  test('saves and deletes a preset', async ({ page }) => {
    await page.goto('/metronome')

    await page.locator('#preset-name').fill('E2E preset')
    await page.getByRole('button', { name: 'Save current settings' }).click()

    await expect(page.getByText('Preset saved.')).toBeVisible()
    await expect(page.locator('li', { hasText: 'E2E preset' })).toBeVisible()

    await page.getByRole('button', { name: 'Delete preset E2E preset' }).click()
    await expect(page.locator('li', { hasText: 'E2E preset' })).toHaveCount(0)
  })
})
