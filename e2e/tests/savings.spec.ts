import type { Page } from '@playwright/test'
import { expect, goTo, netWorth, openApp, rupiah, test } from './helpers'

async function openGoal(page: Page, name: string) {
  await goTo(page, 'Tabungan')
  await page.getByRole('link', { name: new RegExp(name) }).click()
  const saved = page.getByRole('region', { name: 'Ringkasan tabungan' }).locator('p.text-3xl')
  return async () => rupiah((await saved.textContent()) ?? '')
}

test('isi and culik move money between a wallet and a goal', async ({ page }) => {
  await openApp(page)
  const worth = await netWorth(page)
  const saved = await openGoal(page, 'Dana Darurat')
  const start = await saved()

  await page.getByRole('button', { name: 'Isi', exact: true }).click()
  await page.locator('#move-amount').fill('200000')
  await page.getByRole('dialog').getByRole('button', { name: 'Isi tabungan' }).click()
  await expect.poll(saved).toBe(start + 200_000)

  await page.getByRole('button', { name: /Culik/ }).first().click()
  await page.locator('#move-amount').fill('50000')
  await page.getByRole('dialog').getByRole('button', { name: /Culik/ }).click()
  await expect.poll(saved).toBe(start + 150_000)

  // Moving money between your own pockets does not change what you own.
  await goTo(page, 'Beranda')
  await expect.poll(() => netWorth(page)).toBe(worth)
})

test('cannot culik more than the goal holds', async ({ page }) => {
  await openApp(page)
  const saved = await openGoal(page, 'Dana Darurat')
  const balance = await saved()

  await page.getByRole('button', { name: /Culik/ }).first().click()
  await page.locator('#move-amount').fill(String(balance + 1))
  await expect(page.getByText(/Melebihi isi tabungan/)).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', { name: /Culik/ })).toBeDisabled()
})
