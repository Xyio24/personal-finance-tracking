import type { Page } from '@playwright/test'
import { expect, goTo, openApp, test } from './helpers'

/** The open sheet, or else the page, must not be wider than the phone screen. */
async function expectNoSidewaysScroll(page: Page, where: string) {
  const { scroll, client } = await page.evaluate(() => {
    const box = document.querySelector('dialog[open]') ?? document.documentElement
    return { scroll: box.scrollWidth, client: box.clientWidth }
  })
  expect(scroll, `${where} scrolls sideways`).toBeLessThanOrEqual(client)
}

test('no screen or sheet scrolls sideways on a phone', async ({ page }) => {
  await openApp(page)
  await expectNoSidewaysScroll(page, 'Beranda')

  for (const tab of ['Transaksi', 'Tabungan', 'Hutang'] as const) {
    await goTo(page, tab)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoSidewaysScroll(page, tab)
  }

  // A row of wallet chips once pushed this sheet sideways.
  await page.getByRole('button', { name: 'Catat hutang atau piutang' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Tanpa dompet' }).click()
  await expectNoSidewaysScroll(page, 'Debt form')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Catat transaksi' }).click()
  await expectNoSidewaysScroll(page, 'Quick add')
  await page.getByRole('dialog').getByRole('button', { name: 'Pengeluaran' }).click()
  await expect(page.locator('#amount')).toBeVisible()
  await expectNoSidewaysScroll(page, 'Transaction form')
})
