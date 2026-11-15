import type { Locator, Page } from '@playwright/test'
import { expect, goTo, openApp, test } from './helpers'

/** Bottom sheets: animated open/close, swipe down to close, focus, reduced motion. */

/** Touch events through the DevTools protocol (Chromium): Playwright only has tap(). */
async function swipe(
  page: Page,
  from: { x: number; y: number },
  dy: number,
  { steps = 8, stepMs = 0, holdMs = 0 } = {},
) {
  const cdp = await page.context().newCDPSession(page)
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', y?: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: y === undefined ? [] : [{ x: from.x, y }],
    })
  await send('touchStart', from.y)
  for (let i = 1; i <= steps; i++) {
    await send('touchMove', from.y + (dy * i) / steps)
    if (stepMs) await page.waitForTimeout(stepMs)
  }
  if (holdMs) await page.waitForTimeout(holdMs)
  await send('touchEnd')
  await cdp.detach()
}

async function openQuickAdd(page: Page) {
  await openApp(page)
  await page.getByRole('button', { name: 'Catat transaksi' }).click()
  const sheet = page.getByRole('dialog', { name: 'Catat cepat' })
  await expect(sheet).toHaveAttribute('data-state', 'open')
  return sheet
}

/** Top of the sheet's handle area, once it has finished sliding in. */
async function handlePoint(sheet: Locator) {
  await expect.poll(async () => sheet.evaluate((d) => d.getAnimations().length)).toBe(0)
  const box = await sheet.boundingBox()
  if (!box) throw new Error('sheet not visible')
  return { x: box.x + box.width / 2, y: box.y + 12 }
}

test('Escape slides the sheet away and gives focus back', async ({ page }) => {
  const sheet = await openQuickAdd(page)
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveAttribute('data-state', 'closing')
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('button', { name: 'Catat transaksi' })).toBeFocused()
})

test('a tap on the backdrop closes the sheet, a tap inside does not', async ({ page }) => {
  const sheet = await openQuickAdd(page)
  await sheet.getByRole('heading', { name: 'Catat cepat' }).click()
  await expect(sheet).toHaveAttribute('data-state', 'open')

  await page.mouse.click(30, 30) // the dimmed top of the screen is the backdrop
  await expect(sheet).toBeHidden()
})

test('swiping the sheet down closes it', async ({ page }) => {
  const sheet = await openQuickAdd(page)
  await swipe(page, await handlePoint(sheet), 320)
  await expect(sheet).toBeHidden()
})

test('a short, slow drag springs back', async ({ page }) => {
  const sheet = await openQuickAdd(page)
  const start = await handlePoint(sheet)
  const top = (await sheet.boundingBox())?.y
  await swipe(page, start, 40, { steps: 4, stepMs: 30, holdMs: 150 })

  await expect(sheet).toHaveAttribute('data-state', 'open')
  await expect(sheet).not.toHaveAttribute('data-dragging')
  await expect.poll(async () => (await sheet.boundingBox())?.y).toBe(top)
})

test('a swipe that starts on a button does not press it', async ({ page }) => {
  const sheet = await openQuickAdd(page)
  await handlePoint(sheet)
  const button = sheet.getByRole('button', { name: 'Pengeluaran' })
  const box = await button.boundingBox()
  if (!box) throw new Error('button not visible')
  await swipe(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 320)

  await expect(sheet).toBeHidden()
  await expect(page.locator('#amount')).toHaveCount(0) // still on Home, not the expense form
})

test('the amount field is ready to type in "Isi tabungan"', async ({ page }) => {
  await openApp(page)
  await goTo(page, 'Tabungan')
  await page.getByRole('link', { name: /Dana Darurat/ }).click()
  await page.getByRole('button', { name: 'Isi', exact: true }).click()
  await expect(page.locator('#move-amount')).toBeFocused()
})

test('"Simpan" stays at the bottom of a long sheet while the form scrolls beneath it', async ({
  page,
}) => {
  await openApp(page)
  await goTo(page, 'Tabungan')
  await page.getByRole('button', { name: 'Tabungan baru' }).click()
  const sheet = page.getByRole('dialog', { name: 'Tabungan baru' })
  await handlePoint(sheet) // done sliding in
  const header = sheet.locator('[data-sheet-grab]')
  const footer = sheet.locator('[data-sheet-footer]')
  const save = footer.getByRole('button', { name: 'Simpan' })

  expect(await sheet.evaluate((d) => d.scrollHeight > d.clientHeight), 'form is long').toBe(true)
  await expect(save).toBeInViewport({ ratio: 1 })
  await expect(footer).toHaveAttribute('data-stuck', '') // divider: more fields below
  await expect(header).not.toHaveAttribute('data-scrolled')

  // At the end the button sits after the last field again, and the header gets its divider.
  await sheet.evaluate((d) => d.scrollTo({ top: d.scrollHeight }))
  await expect(footer).not.toHaveAttribute('data-stuck')
  await expect(header).toHaveAttribute('data-scrolled', '')

  // A field that gets focus is scrolled clear of the footer, and of the header going up.
  await sheet.evaluate((d) => d.scrollTo({ top: 0 }))
  await expect(footer).toHaveAttribute('data-stuck', '')
  const lastColor = sheet.getByRole('group', { name: 'Warna' }).getByRole('button').last()
  await lastColor.focus()
  const below = await lastColor.boundingBox()
  const bar = await footer.boundingBox()
  expect((below?.y ?? 0) + (below?.height ?? 0)).toBeLessThanOrEqual(bar?.y ?? 0)
  const name = sheet.getByRole('textbox', { name: 'Nama tabungan' })
  await name.focus()
  const above = await name.boundingBox()
  const top = await header.boundingBox()
  expect(above?.y ?? 0).toBeGreaterThanOrEqual((top?.y ?? 0) + (top?.height ?? 0))

  // Enter in a field still saves the form.
  await name.fill('Liburan')
  await name.press('Enter')
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Liburan' })).toBeVisible() // its detail page
})

test('a short sheet keeps its buttons right after the content', async ({ page }) => {
  await openApp(page)
  await goTo(page, 'Tabungan')
  await page.getByRole('link', { name: /Dana Darurat/ }).click()
  await page.getByRole('button', { name: 'Isi', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Isi tabungan' })
  await handlePoint(sheet)
  expect(await sheet.evaluate((d) => d.scrollHeight > d.clientHeight)).toBe(false)
  await expect(sheet.locator('[data-sheet-footer]')).not.toHaveAttribute('data-stuck')
  await expect(sheet.getByRole('button', { name: 'Isi tabungan' })).toBeInViewport({ ratio: 1 })
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('sheets only fade', async ({ page }) => {
    const sheet = await openQuickAdd(page)
    const style = await sheet.evaluate((d) => {
      const s = getComputedStyle(d)
      return { transform: s.transform, transition: s.transitionProperty }
    })
    expect(style.transition).toBe('opacity')
    expect(style.transform).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden({ timeout: 1000 })
  })
})

test('what was typed comes back after closing a sheet by accident, not after saving', async ({
  page,
}) => {
  await openApp(page)
  await goTo(page, 'Tabungan')
  await page.getByRole('link', { name: /Dana Darurat/ }).click()
  const isi = page.getByRole('button', { name: 'Isi', exact: true })
  const sheet = page.getByRole('dialog', { name: 'Isi tabungan' })

  await isi.click()
  await page.locator('#move-amount').fill('75000')
  await page.locator('#move-note').fill('Sisa gaji')
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()

  await isi.click()
  await expect(page.locator('#move-amount')).toHaveValue('75.000')
  await expect(page.locator('#move-note')).toHaveValue('Sisa gaji')
  await sheet.getByRole('button', { name: 'Isi tabungan' }).click()
  await expect(sheet).toBeHidden()

  await isi.click()
  await expect(page.locator('#move-amount')).toHaveValue('')
})
