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
