import { expect, test } from '@playwright/test'

test.describe('ear training', () => {
  test('lists all drills with chord-quality levels and the unscored helper', async ({ page }) => {
    await page.goto('/ear')
    await expect(page.getByRole('heading', { name: 'Ear Training' })).toBeVisible()

    for (const name of ['Intervals', 'Scale degrees', 'Chord quality', 'Progressions', 'Transcription']) {
      await expect(page.locator('section', { hasText: name }).first()).toBeVisible()
    }

    const chordCard = page.locator('section', { hasText: 'Level 1: major vs minor' })
    await expect(chordCard.getByRole('button', { name: 'Level 1' })).toBeVisible()
    await expect(chordCard.getByRole('button', { name: 'Level 2' })).toBeVisible()

    const transcriptionCard = page.locator('section', { hasText: 'Sing the phrase first' })
    await expect(transcriptionCard.getByText('Practice helper · not scored')).toBeVisible()
  })

  test('completes a ten-question round and keeps the accuracy', async ({ page }) => {
    await page.goto('/ear')
    const intervalsCard = page.locator('section', { hasText: 'Name the interval' })
    await intervalsCard.getByRole('button', { name: 'Practice' }).click()
    await expect(page).toHaveURL(/\/ear\/intervals/)

    // Listen, then answer every question with the first option.
    for (let question = 1; question <= 10; question += 1) {
      await page.getByRole('button', { name: 'Play' }).click()
      await page.locator('[data-ear-options] button').first().click()
      await expect(page.getByRole('status')).toBeVisible()
      await page.getByRole('button', { name: 'Next' }).click()
    }

    await expect(page.getByText(/You got \d+\/10 correct/)).toBeVisible()

    // The round is persisted per drill, with streak and average response time.
    await page.goto('/ear')
    await expect(
      page
        .locator('section', { hasText: 'Name the interval' })
        .getByText(/10 answers · \d+% correct · best streak \d+ · ~\d+\.\ds each/),
    ).toBeVisible()
  })

  test('completes a text-only theory round without audio', async ({ page }) => {
    await page.goto('/ear')
    const theoryCard = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Theory quiz', exact: true }) })
    await theoryCard.getByRole('button', { name: 'Practice' }).click()
    await expect(page).toHaveURL(/\/ear\/theory/)

    // No Play button: the prompt text is the question.
    for (let question = 1; question <= 10; question += 1) {
      await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0)
      await page.locator('[data-ear-options] button').first().click()
      await expect(page.getByRole('status')).toBeVisible()
      await page.getByRole('button', { name: 'Next' }).click()
    }

    await expect(page.getByText(/You got \d+\/10 correct/)).toBeVisible()

    // The round lands on the same stat line as the audio drills.
    await page.goto('/ear')
    await expect(
      theoryCard.getByText(/10 answers · \d+% correct · best streak \d+ · ~\d+\.\ds each/),
    ).toBeVisible()
  })

  test('rejects unknown drills and level 2 adds the sevenths', async ({ page }) => {
    await page.goto('/ear/bogus')
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()

    await page.goto('/ear/chord-quality?level=2')
    const options = page.locator('[data-ear-options] button')
    await expect(options).toHaveCount(5)
    await expect(options.filter({ hasText: 'Major 7th' })).toBeVisible()
    await expect(options.filter({ hasText: 'Dominant 7th' })).toBeVisible()
  })
})
