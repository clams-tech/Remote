import { expect, test } from '@playwright/test'

// Render
test('Index page has expected h1', async ({ page }) => {
  await page.goto('/')

  expect(await page.textContent('h1')).toBe('Welcome')
})

// Auth
test('Logged out user gets kicked to welcome page', async ({ page }) => {
  await page.goto('/settings')

  await expect(page).toHaveURL('/welcome')
})

// Login
test('Allow connection to node with valid address', async ({ page }) => {
  await page.goto('/connect')

  await page
    .locator('[name=connection]')
    .fill('02df5ffe895c778e10f7742a6c5b8a0cefbe9465df58b92fadeb883752c8107c8f@35.232.170.67:9735')

  expect(await page.locator('span:has-text("Invalid node connection address")').isVisible()).toBe(
    false
  )

  expect(await page.locator('button:has-text("Connect")').isDisabled()).toBe(false)
})

test('Prevent connection to node with invalid address & render error message', async ({ page }) => {
  await page.goto('/connect')

  await page.locator('[name=connection]').fill('not-a-lightning-address')

  expect(await page.locator('span:has-text("Invalid node connection address")').isVisible()).toBe(
    true
  )

  expect(await page.locator('button:has-text("Connect")').isDisabled()).toBe(true)
})

// @TODO
// i18n
