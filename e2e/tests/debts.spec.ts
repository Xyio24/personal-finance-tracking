import type { Page } from '@playwright/test'
import { expect, goTo, openApp, test } from './helpers'

async function openPiutang(page: Page, person: string) {
  await openApp(page)
  await goTo(page, 'Hutang')
  await page.getByRole('radio', { name: /^Piutang/ }).click()
  await page.getByRole('link', { name: new RegExp(person) }).click()
  await expect(page.getByText('Riwayat')).toBeVisible()
}

const receiveButton = (page: Page) =>
  page.getByRole('dialog').getByRole('button', { name: 'Terima', exact: true })

test('receiving the rest settles a piutang', async ({ page }) => {
  await openPiutang(page, 'Budi')
  await page.getByRole('button', { name: 'Terima', exact: true }).click()
  await page.getByRole('button', { name: 'Lunasi semua' }).click()
  await receiveButton(page).click()
  await expect(page.getByText('Lunas 🎉')).toBeVisible()
})

test('paying more than what is left is not possible', async ({ page }) => {
  await openPiutang(page, 'Budi')
  await page.getByRole('button', { name: 'Terima', exact: true }).click()
  await page.locator('#payment-amount').fill('99000000')
  await expect(page.getByText(/Melebihi sisa/)).toBeVisible()
  await expect(receiveButton(page)).toBeDisabled()
})

test('a write-off can be undone', async ({ page }) => {
  await openPiutang(page, 'Rina')
  await page.getByRole('button', { name: 'Ikhlaskan' }).click()
  await page
    .getByRole('dialog', { name: 'Ikhlaskan?' })
    .getByRole('button', { name: 'Ikhlaskan' })
    .click()
  await expect(page.getByText('Sisa piutang ini sudah diikhlaskan.')).toBeVisible()

  await page.getByRole('button', { name: 'Batalkan' }).click()
  await expect(page.getByRole('button', { name: 'Terima', exact: true })).toBeVisible()
})

/** Pengaturan → Dompet, from a page that has the settings link in its header. */
async function openWallets(page: Page) {
  await page.getByRole('link', { name: 'Pengaturan akun' }).first().click()
  await expect(page.getByRole('heading', { name: 'Pengaturan', level: 1 })).toBeVisible()
  await page.getByRole('link', { name: /Tunai, rekening bank, e-wallet/ }).click()
  await expect(page.getByRole('heading', { name: 'Dompet', level: 1 })).toBeVisible()
}

test('a debt moves money in the wallet you pick, and the next entry starts there', async ({
  page,
}) => {
  await openApp(page)
  // A fourth wallet with a long name sits past the right edge of the wallet chips.
  await openWallets(page)
  await page.getByRole('button', { name: 'Tambah dompet' }).click()
  await page.locator('#account-name').fill('Dompet Cadangan Keluarga')
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan' }).click()
  const wallet = page.getByRole('button', { name: /Dompet Cadangan Keluarga/ })
  await expect(wallet).toBeVisible()

  await goTo(page, 'Hutang')
  await page.getByRole('button', { name: 'Catat hutang atau piutang' }).first().click()
  const form = page.getByRole('dialog', { name: 'Catat hutang atau piutang' })
  await form.locator('#debt-person').fill('Sepupu')
  await form.locator('#debt-amount').fill('150000')
  await form.getByRole('button', { name: 'Dompet Cadangan Keluarga' }).click()
  await form.getByRole('button', { name: 'Simpan' }).click()
  await expect(page.getByRole('heading', { name: 'Sepupu' })).toBeVisible()

  // The money landed in that wallet.
  await goTo(page, 'Beranda')
  await openWallets(page)
  await expect(wallet).toContainText('Rp 150.000')

  // The next entry starts with that wallet chosen, scrolled into view in the chip row.
  await page.getByRole('button', { name: 'Catat transaksi' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Pengeluaran' }).click()
  const chip = page.getByRole('button', { name: 'Dompet Cadangan Keluarga' })
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await expect(chip).toBeInViewport({ ratio: 1 })
})
