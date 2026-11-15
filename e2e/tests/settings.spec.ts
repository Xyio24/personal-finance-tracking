import { readFile } from 'node:fs/promises'
import { expect, openApp, test } from './helpers'

test('exports every transaction as a CSV file', async ({ page }) => {
  await openApp(page)
  await page.getByRole('link', { name: 'Pengaturan akun' }).first().click()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('Ekspor transaksi (CSV)').click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^keuangan-\d{4}-\d{2}-\d{2}\.csv$/)

  const bytes = await readFile(await download.path())
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  const lines = bytes.toString('utf8').slice(1).trimEnd().split('\r\n')
  expect(lines[0]).toBe('Tanggal,Jenis,Jumlah,Dompet,Dompet tujuan,Kategori,Tabungan,Orang,Catatan')
  expect(lines.length).toBeGreaterThan(10)
})

test('the demo export reads its local data even offline', async ({ page, context }) => {
  await openApp(page)
  await page.getByRole('link', { name: 'Pengaturan akun' }).first().click()
  await context.setOffline(true) // only changes fail offline in the demo, like the real API
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('Ekspor transaksi (CSV)').click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.csv$/)
  await context.setOffline(false)
})

test('logging out leads to the login page and back in', async ({ page }) => {
  await openApp(page)
  await page.getByRole('link', { name: 'Pengaturan akun' }).first().click()
  await page.getByRole('button', { name: 'Keluar' }).click()

  const login = page.getByRole('button', { name: /Masuk dengan Google/ })
  await expect(login).toBeVisible()
  await login.click()
  await expect(page.getByText('Kekayaan bersih')).toBeVisible()
})
