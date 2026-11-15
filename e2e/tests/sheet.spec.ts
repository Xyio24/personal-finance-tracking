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

/**
 * Scrolls the sheet so `target` hides 12 px under its sticky header ('top') or footer
 * ('bottom'), then focuses it. Reports how far it was under the bar before and after (negative:
 * covered), and whether the focus scroll ended at either end of the sheet, where the bars sit
 * apart from the content anyway and a pass would prove nothing.
 */
async function focusPartlyHidden(sheet: Locator, target: Locator, edge: 'top' | 'bottom') {
  const element = await target.elementHandle()
  return sheet.evaluate(
    (dialog, { element, edge }) => {
      const bar = dialog.querySelector(edge === 'top' ? '[data-sheet-grab]' : '[data-sheet-footer]')
      if (!bar || !element) throw new Error('bar or target missing')
      const gap = () => {
        const box = element.getBoundingClientRect()
        const edgeOfBar = bar.getBoundingClientRect()
        return edge === 'top' ? box.top - edgeOfBar.bottom : edgeOfBar.top - box.bottom
      }
      dialog.scrollTop += (edge === 'top' ? 1 : -1) * (gap() + 12) // gap → -12
      const hiddenBefore = gap()
      ;(element as HTMLElement).focus()
      const max = dialog.scrollHeight - dialog.clientHeight
      return {
        hiddenBefore,
        gapAfter: gap(),
        clamped: dialog.scrollTop <= 0 || dialog.scrollTop >= max - 1,
      }
    },
    { element, edge },
  )
}

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

  const name = sheet.getByRole('textbox', { name: 'Nama tabungan' })
  await name.fill('Liburan') // enables Simpan

  // A field half under the footer or the header scrolls just enough to clear it.
  const color = sheet.getByRole('group', { name: 'Warna' }).getByRole('button').first()
  for (const [target, edge] of [
    [color, 'bottom'],
    [sheet.locator('#goal-target'), 'top'],
  ] as const) {
    const focused = await focusPartlyHidden(sheet, target, edge)
    expect(focused.hiddenBefore, `${edge}: starts under the bar`).toBeLessThan(-5)
    expect(focused.clamped, `${edge}: not at either end of the scroll`).toBe(false)
    expect(focused.gapAfter, `${edge}: clear of the bar`).toBeGreaterThanOrEqual(-1)
  }

  // The bars' own buttons are always in view: focusing them must not scroll the form.
  await sheet.evaluate((d) => d.scrollTo({ top: 200 }))
  for (const button of [header.getByRole('button', { name: 'Tutup' }), save]) {
    await button.focus()
    expect(await sheet.evaluate((d) => d.scrollTop)).toBe(200)
  }

  // Enter in a field still saves the form.
  await name.press('Enter')
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Liburan' })).toBeVisible() // its detail page
})

test('a save that fails in a long form says why right above the pinned "Simpan"', async ({
  page,
  context,
}) => {
  await openApp(page)
  await goTo(page, 'Tabungan')
  await page.getByRole('button', { name: 'Tabungan baru' }).click()
  const sheet = page.getByRole('dialog', { name: 'Tabungan baru' })
  await handlePoint(sheet)
  await sheet.getByRole('textbox', { name: 'Nama tabungan' }).fill('Liburan')
  expect(await sheet.evaluate((d) => d.scrollTop)).toBe(0) // the colour picker is far below

  await context.setOffline(true)
  await sheet.getByRole('button', { name: 'Simpan' }).click()
  const error = sheet.locator('[data-sheet-footer]').getByRole('alert')
  await expect(error).toContainText('Tidak bisa terhubung')
  await expect(error).toBeInViewport({ ratio: 1 })
  await context.setOffline(false)
})

test('why an action failed shows next to its button, not somewhere below', async ({ page }) => {
  await openApp(page)
  await page.getByRole('link', { name: 'Pengaturan akun' }).first().click()
  await page.getByRole('link', { name: /Dompet/ }).click()
  await page.getByRole('button', { name: /Tunai/ }).click()
  await page
    .getByRole('dialog', { name: 'Ubah dompet' })
    .getByRole('button', { name: 'Hapus' })
    .click()
  const confirm = page.getByRole('dialog', { name: 'Hapus dompet?' })
  await confirm.getByRole('button', { name: 'Hapus' }).click() // Tunai has transactions

  const error = confirm.locator('[data-sheet-footer]').getByRole('alert')
  await expect(error).toContainText('Masih dipakai')
  await expect(error).toBeInViewport({ ratio: 1 })
})

/**
 * Focuses `target` without scrolling, then scrolls the sheet so it is `clearance` px clear of the
 * sticky header ('top') or footer ('bottom'); negative: hidden under it, as a finger scroll can
 * leave a field being typed in.
 */
async function focusAt(sheet: Locator, target: Locator, edge: 'top' | 'bottom', clearance: number) {
  const element = await target.elementHandle()
  await sheet.evaluate(
    (dialog, { element, edge, clearance }) => {
      const bar = dialog.querySelector(edge === 'top' ? '[data-sheet-grab]' : '[data-sheet-footer]')
      if (!bar || !element) throw new Error('bar or target missing')
      ;(element as HTMLElement).focus({ preventScroll: true })
      const box = element.getBoundingClientRect()
      const barBox = bar.getBoundingClientRect()
      const gap = edge === 'top' ? box.top - barBox.bottom : barBox.top - box.bottom
      dialog.scrollTop += (edge === 'top' ? 1 : -1) * (gap - clearance)
    },
    { element, edge, clearance },
  )
}

/** How far the middle of `target` (its text line) is clear of the bar; negative: behind it. */
async function middleClearOf(sheet: Locator, target: Locator, edge: 'top' | 'bottom') {
  const bar = sheet.locator(edge === 'top' ? '[data-sheet-grab]' : '[data-sheet-footer]')
  const [box, barBox] = await Promise.all([target.boundingBox(), bar.boundingBox()])
  if (!box || !barBox) throw new Error('not visible')
  const middle = box.y + box.height / 2
  return edge === 'top' ? middle - (barBox.y + barBox.height) : barBox.y - middle
}

test.describe('on a short screen, as with the keyboard up', () => {
  test.use({ viewport: { width: 412, height: 480 } })

  test('the field being typed in stays clear of the header and the footer', async ({ page }) => {
    await openApp(page)
    await goTo(page, 'Hutang')
    await page.getByRole('link', { name: /Kakak/ }).click()
    await page.getByRole('button', { name: 'Ubah catatan', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Ubah catatan' })
    await handlePoint(sheet)
    const footer = sheet.locator('[data-sheet-footer]')

    // Typing follows the caret out from under either bar.
    for (const [target, edge] of [
      [sheet.locator('#debt-person'), 'top'],
      [sheet.locator('#debt-note'), 'bottom'],
    ] as const) {
      await focusAt(sheet, target, edge, -30)
      expect(await middleClearOf(sheet, target, edge), `${edge}: starts hidden`).toBeLessThan(0)
      await page.keyboard.type('a')
      expect(await middleClearOf(sheet, target, edge), `${edge}: typed text shows`).toBeGreaterThan(
        0,
      )
    }

    // A changed amount brings up a note in the footer about the wallet; the taller footer must
    // not cover the amount being typed just above it.
    const amount = sheet.locator('#debt-amount')
    await focusAt(sheet, amount, 'bottom', 10)
    await page.keyboard.type('1')
    await expect(footer).toContainText('dihitung ulang')
    const [field, bar] = await Promise.all([amount.boundingBox(), footer.boundingBox()])
    expect((bar?.y ?? 0) - ((field?.y ?? 0) + (field?.height ?? 0))).toBeGreaterThanOrEqual(-1)
  })
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
