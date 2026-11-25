import { expect, type Page } from '@playwright/test'

/** Create a single-section template through the UI and return its page. */
export async function createSingleSectionTemplate(
  page: Page,
  name: string,
  sectionName = 'Focus',
  minutes = 1,
): Promise<void> {
  await page.goto('/templates')
  await page.getByRole('button', { name: 'New template' }).click()
  await page.getByLabel('Template name').fill(name)
  await page.locator('#section-name-0').fill(sectionName)
  await page.locator('#section-minutes-0').fill(String(minutes))
  await page.getByRole('button', { name: 'Create template' }).click()
  await expect(page).toHaveURL(/\/templates\/\d+/)
}

/** Start a full session for the named template from the templates list. */
export async function startTemplateSession(page: Page, name: string): Promise<void> {
  await page.goto('/templates')
  const card = page.locator('section', { hasText: name }).first()
  await card.getByRole('button', { name: 'Start' }).click()
  await expect(page).toHaveURL(/\/sessions\/\d+/)
  await expect(page.locator('[data-session-status="active"]')).toBeVisible()
}

/** Create an exercise through the UI and land on its detail page. */
export async function createExercise(
  page: Page,
  name: string,
  type: 'timed' | 'untimed' = 'timed',
): Promise<void> {
  await page.goto('/exercises')
  await page.getByRole('button', { name: 'New exercise' }).click()
  await page.getByLabel('Exercise name').fill(name)
  if (type === 'untimed') {
    await page.getByLabel('Type').selectOption('untimed')
  }
  await page.getByRole('button', { name: 'Create exercise' }).click()
  await expect(page).toHaveURL(/\/exercises\/\d+/)
}
