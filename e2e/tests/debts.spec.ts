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
