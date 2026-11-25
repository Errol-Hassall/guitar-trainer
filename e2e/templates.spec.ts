import { expect, test } from '@playwright/test'

test.describe('templates', () => {
  test('lists built-ins without edit or delete actions', async ({ page }) => {
    await page.goto('/templates')

    const daily = page.locator('section', { hasText: 'Daily 60' }).first()
    await expect(daily).toBeVisible()
    await expect(daily.getByRole('button', { name: 'Edit' })).toHaveCount(0)
    await expect(daily.getByRole('button', { name: 'Start' })).toBeVisible()
  })

  test('creates, renames and deletes a custom template', async ({ page }) => {
    // Create.
    await page.goto('/templates')
    await page.getByRole('button', { name: 'New template' }).click()
    await page.getByLabel('Template name').fill('E2E routine')
    await page.locator('#section-name-0').fill('Warm-up')
    await page.locator('#section-minutes-0').fill('5')
    await page.getByRole('button', { name: 'Create template' }).click()

    // Lands on the edit page.
    await expect(page).toHaveURL(/\/templates\/\d+/)
    await expect(page.getByRole('heading', { name: /E2E routine/ })).toBeVisible()

    // Rename through the edit form.
    await page.getByLabel('Template name').fill('E2E renamed')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page).toHaveURL('/templates')
    await expect(
      page.locator('section', { hasText: 'E2E renamed' }).first(),
    ).toBeVisible()

    // Delete with confirmation.
    const card = page.locator('section', { hasText: 'E2E renamed' }).first()
    await card.getByRole('button', { name: 'Delete template E2E renamed' }).click()
    await card.getByRole('button', { name: 'Confirm delete' }).click()
    await expect(
      page.locator('section', { hasText: 'E2E renamed' }),
    ).toHaveCount(0)
  })

  test('rejects a template without a section name', async ({ page }) => {
    await page.goto('/templates/new')
    await page.getByLabel('Template name').fill('Broken')
    await page.getByRole('button', { name: 'Create template' }).click()

    await expect(page.getByRole('alert')).toHaveText('Section 1 needs a name.')
  })
})
