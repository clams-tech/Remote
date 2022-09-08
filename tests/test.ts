import { expect, test } from '@playwright/test'

test('Welcome page has expected h1', async ({ page }) => {
  await page.goto('/')

  expect(await page.textContent('h1')).toBe('Welcome')
})
