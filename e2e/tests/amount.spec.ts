import { expect, openApp, test } from './helpers'

/** Typing in the amount field: the caret stays put while digits are regrouped. */

test('correcting a digit in the middle keeps the caret there', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Catat transaksi' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Pengeluaran' }).click()
  const amount = page.locator('#amount')
  await amount.pressSequentially('125000')
  await expect(amount).toHaveValue('125.000')

  // Caret after "12", type 3: 1.235.000, and the next digit goes right after the 3.
  await amount.evaluate((input: HTMLInputElement) => input.setSelectionRange(2, 2))
  await page.keyboard.type('3')
  await expect(amount).toHaveValue('1.235.000')
  await page.keyboard.type('9')
  await expect(amount).toHaveValue('12.395.000')
})

test('backspace right after a dot deletes the digit before it', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Catat transaksi' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Pengeluaran' }).click()
  const amount = page.locator('#amount')
  await amount.pressSequentially('1250000')
  await expect(amount).toHaveValue('1.250.000')

  await amount.evaluate((input: HTMLInputElement) => input.setSelectionRange(6, 6)) // after "1.250."
  await page.keyboard.press('Backspace')
  await expect(amount).toHaveValue('125.000')
  await page.keyboard.press('Backspace') // the caret stayed after "125": the 5 goes
  await expect(amount).toHaveValue('12.000')
})
