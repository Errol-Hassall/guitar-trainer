import { expect, test } from '@playwright/test'
import { createExercise } from './helpers'

test.describe('exercises', () => {
  test('creates a timed exercise and builds the BPM graph from logs', async ({ page }) => {
    await createExercise(page, 'E2E picking drill')
    await expect(page.getByRole('heading', { name: 'E2E picking drill' })).toBeVisible()

    // First log renders the graph with one point.
    const maxBpmInput = page.getByLabel('Max clean BPM', { exact: true })
    await maxBpmInput.fill('120')
    await page.getByLabel('Duration (seconds)').fill('300')
    await page.getByRole('button', { name: 'Log progress' }).click()
    await expect(page.locator('[data-log-count]')).toHaveAttribute('data-log-count', '1')
    await expect(page.locator('[data-bpm-graph]')).toBeVisible()
    await expect(page.locator('[data-bpm-graph]')).toHaveAttribute('data-points', '1')

    // A second log adds a point.
    await maxBpmInput.fill('130')
    await page.getByRole('button', { name: 'Log progress' }).click()
    await expect(page.locator('[data-bpm-graph]')).toHaveAttribute('data-points', '2')
  })

  test('untimed exercises use a self rating and show no BPM graph', async ({ page }) => {
    await createExercise(page, 'E2E chord shape', 'untimed')

    // The timed-only inputs and graph are absent.
    await expect(page.getByLabel('Max clean BPM')).toHaveCount(0)
    await expect(page.locator('[data-bpm-graph]')).toHaveCount(0)

    await page.getByLabel('Self rating').selectOption('4')
    await page.getByRole('button', { name: 'Log progress' }).click()
    await expect(page.locator('[data-log-count]')).toHaveAttribute('data-log-count', '1')
    await expect(page.locator('li', { hasText: 'Rated 4/5' })).toBeVisible()
  })

  test('rejects a timed log without a max clean BPM', async ({ page }) => {
    await createExercise(page, 'E2E no bpm')
    await page.getByRole('button', { name: 'Log progress' }).click()
    await expect(page.getByRole('alert')).toHaveText(/Max clean BPM/)
    await expect(page.locator('[data-log-count]')).toHaveAttribute('data-log-count', '0')
  })

  test('edits and deletes an exercise with confirmation', async ({ page }) => {
    await createExercise(page, 'E2E to rename')

    // Edit the name through the inline form.
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Exercise name').fill('E2E renamed')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('heading', { name: 'E2E renamed' })).toBeVisible()

    // Delete with confirmation.
    await page.getByRole('button', { name: 'Delete exercise E2E renamed' }).click()
    await page.getByRole('button', { name: 'Confirm delete' }).click()
    await expect(page).toHaveURL('/exercises')
    await expect(page.locator('section', { hasText: 'E2E renamed' })).toHaveCount(0)
  })
})
