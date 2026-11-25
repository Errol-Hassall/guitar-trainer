import { expect, test } from '@playwright/test'

test.describe('learning paths', () => {
  test('lists seeded paths and walks the skill tree step by step', async ({ page }) => {
    await page.goto('/learning')
    await expect(page.getByRole('heading', { name: 'Learning' })).toBeVisible()

    // Every seeded path mirrors a weekly rotation theme.
    const pickingCard = page.locator('section', { hasText: 'Alternate Picking 101 → 301' })
    await expect(pickingCard).toBeVisible()
    await expect(pickingCard.getByText('Picking & Pulse')).toBeVisible()

    await pickingCard.getByRole('button', { name: 'Open' }).click()
    await expect(page).toHaveURL(/\/learning\/\d+/)

    // Step 1 is unlocked; steps 2 and 3 are locked behind it.
    const stepOne = page.locator('section', { hasText: 'Step 1: Alternate Picking 101' })
    await expect(stepOne.getByRole('button', { name: /Mark complete/ })).toBeVisible()
    await expect(page.locator('section', { hasText: 'Step 2: Alternate Picking 201' }).getByText('Locked')).toBeVisible()
    await expect(page.locator('section', { hasText: 'Step 3: Alternate Picking 301' }).getByText('Locked')).toBeVisible()

    // Completing step 1 unlocks step 2 and updates the list progress.
    await page.getByRole('button', { name: 'Mark complete: Alternate Picking 101' }).click()
    const stepTwo = page.locator('section', { hasText: 'Step 2: Alternate Picking 201' })
    await expect(stepTwo.getByRole('button', { name: /Mark complete/ })).toBeVisible()
    await expect(page.getByText('Requires: Alternate Picking 101')).toBeVisible()

    await page.goto('/learning')
    await expect(pickingCard.getByText('1/3 steps done')).toBeVisible()

    // Leave the tree clean for the next test.
    await pickingCard.getByRole('button', { name: 'Open' }).click()
    await page.getByRole('button', { name: 'Mark incomplete: Alternate Picking 101' }).click()
    await expect(
      page.locator('section', { hasText: 'Step 2: Alternate Picking 201' }).getByText('Locked'),
    ).toBeVisible()
  })

  test('rejects un-completing a step that completed steps depend on', async ({ page }) => {
    await page.goto('/learning')
    const pickingCard = page.locator('section', { hasText: 'Alternate Picking 101 → 301' })
    await pickingCard.getByRole('button', { name: 'Open' }).click()

    // Complete the first two steps.
    await page.getByRole('button', { name: 'Mark complete: Alternate Picking 101' }).click()
    await page.getByRole('button', { name: 'Mark complete: Alternate Picking 201' }).click()
    await expect(
      page.locator('section', { hasText: 'Step 3: Alternate Picking 301' }).getByRole('button', { name: /Mark complete/ }),
    ).toBeVisible()

    // Clearing step 1 while step 2 is done must fail with a helpful error.
    await page.getByRole('button', { name: 'Mark incomplete: Alternate Picking 101' }).click()
    await expect(page.getByRole('alert')).toHaveText(/depend on this one/i)

    // Clearing the dependent first makes it work.
    await page.getByRole('button', { name: 'Mark incomplete: Alternate Picking 201' }).click()
    await page.getByRole('button', { name: 'Mark incomplete: Alternate Picking 101' }).click()
    await page.goto('/learning')
    await expect(
      page.locator('section', { hasText: 'Alternate Picking 101 → 301' }).getByText('0/3 steps done'),
    ).toBeVisible()
  })

  test('imports an exercise pack from markdown, idempotently', async ({ page }) => {
    const pack = Buffer.from(
      '## Exercises\n### E2E Pack Drill (timed · difficulty 2)\nTags: pack\n',
    )
    await page.goto('/data')
    await page.locator('#import-exercises').setInputFiles({ name: 'pack.md', mimeType: 'text/markdown', buffer: pack })
    await expect(page.getByText('Imported 1 exercise from pack.md.')).toBeVisible()

    // Same file again: the existing name is skipped.
    await page.locator('#import-exercises').setInputFiles({ name: 'pack.md', mimeType: 'text/markdown', buffer: pack })
    await expect(page.getByText('No new exercises found in that file.')).toBeVisible()

    await page.goto('/exercises')
    await expect(page.locator('section', { hasText: 'E2E Pack Drill' })).toBeVisible()
  })

  test('marks built-in exercises read-only in the exercise library', async ({ page }) => {
    await page.goto('/exercises')
    const builtinCard = page.locator('section', { hasText: 'Chromatic Warm-up' })
    await expect(builtinCard.getByText('Built-in')).toBeVisible()
    // No delete affordance on built-ins.
    await expect(builtinCard.getByRole('button', { name: /Delete exercise/ })).toHaveCount(0)

    await builtinCard.getByRole('button', { name: 'Open' }).click()
    await expect(page.getByText('Built-in · read-only')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)
  })
})
