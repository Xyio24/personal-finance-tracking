import { expect, goTo, netWorth, openApp, test } from './helpers'

/** Toasts after saving and deleting, and "Urungkan". */

test('a new expense is confirmed and can be undone', async ({ page }) => {
  await openApp(page)
  const before = await netWorth(page)

  await page.getByRole('button', { name: 'Catat transaksi' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Pengeluaran' }).click()
  await page.locator('#amount').fill('125000')
  await page.getByRole('button', { name: 'Makan & Minum' }).click()
  await page.getByRole('button', { name: 'Simpan' }).click()

  const status = page.getByRole('status').filter({ hasText: 'dicatat' })
  await expect(status).toContainText(/Pengeluaran Rp\s125\.000 dicatat/)
  // The list already shows it, without waiting for a refetch.
  await expect.poll(() => netWorth(page)).toBe(before - 125_000)

  await status.getByRole('button', { name: 'Urungkan' }).click()
  await expect(page.getByRole('status')).toContainText('Sudah diurungkan')
  await expect.poll(() => netWorth(page)).toBe(before)
})

test('a deleted transaction can be brought back', async ({ page }) => {
  await openApp(page)
  const before = await netWorth(page)
  const recent = page.getByRole('region', { name: 'Transaksi terakhir' })
  const firstNote = await recent.getByRole('listitem').first().textContent()

  await recent.getByRole('listitem').first().getByRole('link').click()
  await page.getByRole('button', { name: 'Hapus transaksi ini' }).click()
  await page
    .getByRole('dialog', { name: 'Hapus transaksi?' })
    .getByRole('button', { name: 'Hapus' })
    .click()

  const status = page.getByRole('status')
  await expect(status).toContainText('Transaksi dihapus')
  await expect.poll(() => netWorth(page)).not.toBe(before)
  await status.getByRole('button', { name: 'Urungkan' }).click()

  await expect.poll(() => netWorth(page)).toBe(before)
  await expect(recent.getByRole('listitem').first()).toHaveText(firstNote ?? '')
})

test('writing off a piutang can be undone from the toast', async ({ page }) => {
  await openApp(page)
  await goTo(page, 'Hutang')
  await page.getByRole('radio', { name: /^Piutang/ }).click()
  await page.getByRole('link', { name: /Rina/ }).click()
  await page.getByRole('button', { name: 'Ikhlaskan' }).click()
  await page
    .getByRole('dialog', { name: 'Ikhlaskan?' })
    .getByRole('button', { name: 'Ikhlaskan' })
    .click()

  const status = page.getByRole('status')
  await expect(status).toContainText('Sisa piutang diikhlaskan')
  await status.getByRole('button', { name: 'Urungkan' }).click()
  await expect(page.getByRole('button', { name: 'Terima', exact: true })).toBeVisible()
})
