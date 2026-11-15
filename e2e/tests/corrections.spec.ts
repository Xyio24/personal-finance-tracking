import type { Page } from '@playwright/test'
import { expect, goTo, netWorth, openApp, rupiah, test } from './helpers'

/** Fixing or removing wrongly entered data, everywhere it can be entered. */

async function amountIn(page: Page, inputId: string) {
  return rupiah(await page.locator(`#${inputId}`).inputValue())
}

async function openDebt(page: Page, side: 'Hutang' | 'Piutang', person: string) {
  await goTo(page, 'Hutang')
  await page.getByRole('radio', { name: new RegExp(`^${side}`) }).click()
  await page.getByRole('link', { name: new RegExp(person) }).click()
  await expect(page.getByText('Riwayat')).toBeVisible()
}

const debtLeft = async (page: Page) =>
  rupiah(
    (await page.getByRole('region', { name: 'Ringkasan' }).locator('p.text-3xl').textContent()) ??
      '',
  )

test.describe('transactions', () => {
  test('a wrong expense can be deleted from its edit page', async ({ page }) => {
    await openApp(page)
    const before = await netWorth(page)
    const recent = page.getByRole('region', { name: 'Transaksi terakhir' })
    const row = recent.getByRole('listitem').first()
    // \s: amounts are formatted with a non-breaking space after "Rp".
    const spent = -rupiah((await row.textContent())?.match(/−Rp\s[\d.]+/)?.[0] ?? '')
    expect(spent).toBeGreaterThan(0)

    await row.getByRole('link').click()
    await page.getByRole('button', { name: 'Hapus transaksi ini' }).click()
    const confirm = page.getByRole('dialog', { name: 'Hapus transaksi?' })
    await expect(confirm).toContainText(/Pengeluaran Rp\s[\d.]+ · .+ akan dihapus permanen/)
    await expect(confirm).toContainText('bertambah')
    await confirm.getByRole('button', { name: 'Hapus' }).click()

    await expect.poll(() => netWorth(page)).toBe(before + spent)
  })
})

test.describe('hutang & piutang', () => {
  test('a piutang with payments is deleted together with them', async ({ page }) => {
    await openApp(page)
    const before = await netWorth(page)
    await openDebt(page, 'Piutang', 'Budi')

    await page.getByRole('button', { name: 'Hapus piutang' }).click()
    const confirm = page.getByRole('dialog', { name: 'Hapus piutang ini?' })
    await expect(confirm).toContainText(/1 pembayaran \(total Rp\s[\d.]+\) juga ikut terhapus/)
    await confirm.getByRole('button', { name: 'Hapus' }).click()

    await page.getByRole('radio', { name: /^Piutang/ }).click()
    await expect(page.getByRole('link', { name: /Budi/ })).toHaveCount(0)
    // Lent money and repayments come back out of the wallets, and the piutang is gone with them.
    await goTo(page, 'Beranda')
    await expect.poll(() => netWorth(page)).toBe(before)
  })

  test('a payment can be corrected in place', async ({ page }) => {
    await openApp(page)
    await openDebt(page, 'Piutang', 'Budi')
    const left = await debtLeft(page)

    await page
      .getByRole('button', { name: /^Ubah pembayaran/ })
      .first()
      .click()
    const old = await amountIn(page, 'payment-amount')
    await page.locator('#payment-amount').fill(String(old - 100_000))
    await page
      .getByRole('dialog', { name: 'Ubah pembayaran' })
      .getByRole('button', { name: 'Simpan' })
      .click()

    await expect.poll(() => debtLeft(page)).toBe(left + 100_000)
  })

  test('the wallet of a debt can be corrected', async ({ page }) => {
    await openApp(page)
    await openDebt(page, 'Hutang', 'Paylater')
    await expect(page.getByRole('region', { name: 'Ringkasan' })).toContainText('Tanpa dompet')

    await page.getByRole('button', { name: 'Ubah catatan' }).click()
    const sheet = page.getByRole('dialog', { name: 'Ubah catatan' })
    await sheet.getByRole('button', { name: 'Tunai' }).click()
    await expect(sheet).toContainText('saldo dompet dihitung ulang')
    await sheet.getByRole('button', { name: 'Simpan' }).click()

    await expect(page.getByRole('region', { name: 'Ringkasan' })).toContainText('Tunai')
    await expect(page.getByRole('button', { name: /^Ubah catatan Rp/ })).toBeVisible()
  })
})

test.describe('tabungan', () => {
  test('an isi can be corrected in place', async ({ page }) => {
    await openApp(page)
    await goTo(page, 'Tabungan')
    await page.getByRole('link', { name: /Dana Darurat/ }).click()
    const summary = page.getByRole('region', { name: 'Ringkasan tabungan' }).locator('p.text-3xl')
    const saved = async () => rupiah((await summary.textContent()) ?? '')
    const before = await saved()

    await page
      .getByRole('button', { name: /^Ubah isi/ })
      .first()
      .click()
    const old = await amountIn(page, 'move-amount')
    await page.locator('#move-amount').fill(String(old + 100_000))
    await page
      .getByRole('dialog', { name: 'Ubah isi tabungan' })
      .getByRole('button', { name: 'Simpan' })
      .click()

    await expect.poll(saved).toBe(before + 100_000)
  })

  test('a goal is deleted together with its isi and culik', async ({ page }) => {
    await openApp(page)
    const before = await netWorth(page)
    await goTo(page, 'Tabungan')
    await page.getByRole('link', { name: /Dana Darurat/ }).click()

    await page.getByRole('button', { name: 'Hapus tabungan' }).click()
    const confirm = page.getByRole('dialog', { name: 'Hapus tabungan ini?' })
    await expect(confirm).toContainText(/catatan isi\/culik ikut terhapus/)
    // Only the starting amount leaves net worth; isi and culik just move back between pockets.
    const initial = rupiah(
      (await confirm.textContent())?.match(/Saldo awal (Rp\s[\d.]+)/)?.[1] ?? '',
    )
    await confirm.getByRole('button', { name: 'Hapus' }).click()

    await expect(page.getByRole('link', { name: /Dana Darurat/ })).toHaveCount(0)
    await goTo(page, 'Beranda')
    await expect.poll(() => netWorth(page)).toBe(before - initial)
  })
})

test('cancelling a confirmation keeps the sheet under it open', async ({ page }) => {
  await openApp(page)
  await page.getByRole('link', { name: 'Pengaturan akun' }).first().click()
  await page.getByRole('link', { name: /Dompet/ }).click()
  await page.getByRole('button', { name: /BCA/ }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Ubah dompet' })
  await sheet.getByRole('button', { name: 'Hapus' }).click()

  await page
    .getByRole('dialog', { name: 'Hapus dompet?' })
    .getByRole('button', { name: 'Batal' })
    .click()
  await expect(page.getByRole('dialog', { name: 'Hapus dompet?' })).toBeHidden()
  await expect(sheet).toBeVisible()
})
