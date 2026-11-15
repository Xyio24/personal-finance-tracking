import { expect, goTo, netWorth, openApp, test } from './helpers'

test('an expense lowers net worth and tops the recent list', async ({ page }) => {
  await openApp(page)
  const before = await netWorth(page)

  await page.getByRole('button', { name: 'Catat transaksi' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Pengeluaran' }).click()
  await page.locator('#amount').fill('125000')
  await page.getByRole('button', { name: 'Makan & Minum' }).click()
  await page.locator('#note').fill('Makan siang tim')
  await page.getByRole('button', { name: 'Simpan' }).click()

  await expect.poll(() => netWorth(page)).toBe(before - 125_000)
  const recent = page.getByRole('region', { name: 'Transaksi terakhir' })
  await expect(recent.getByRole('listitem').first()).toContainText('Makan siang tim')
})

test('search finds notes across all months', async ({ page }) => {
  await openApp(page)
  await goTo(page, 'Transaksi')
  await page.getByRole('searchbox').fill('nasi padang')
  await expect(page.getByText(/hasil untuk/)).toBeVisible()
  await expect(page.getByText('Nasi padang').first()).toBeVisible()
})
