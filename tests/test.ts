import { expect, test } from '@playwright/test'

test('Index page has expected h1', async ({ page }) => {
  await page.goto('/')

  expect(await page.textContent('h1')).toBe('Welcome')
})

test('Logged out user gets kicked to welcome page', async ({ page }) => {
  await page.goto('/settings')

  await expect(page).toHaveURL('/welcome')
})
