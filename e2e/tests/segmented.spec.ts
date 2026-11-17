import type { Locator, Page } from '@playwright/test'
import { expect, goTo, openApp, test } from './helpers'

/** Hutang/Piutang on the debts page: a segmented control with the liquid glass pill. */
async function openDebts(page: Page) {
  await openApp(page)
  await goTo(page, 'Hutang')
  const group = page.getByRole('radiogroup', { name: 'Jenis' })
  return {
    group,
    hutang: group.getByRole('radio', { name: /^Hutang/ }),
    piutang: group.getByRole('radio', { name: /^Piutang/ }),
  }
}

async function centerOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('not on screen')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** How far the pill's center is from an option's center, in px. */
async function pillOffset(group: Locator, option: Locator) {
  const pill = await group.locator('.liquid-pill').boundingBox()
  if (!pill) return Number.POSITIVE_INFINITY
  return Math.abs(pill.x + pill.width / 2 - (await centerOf(option)).x)
}

test('tapping an option moves the pill there', async ({ page }) => {
  const { group, hutang, piutang } = await openDebts(page)
  await expect(hutang).toHaveAttribute('aria-checked', 'true')
  await expect.poll(() => pillOffset(group, hutang)).toBeLessThan(1)

  await piutang.click()
  await expect(piutang).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('link', { name: /Budi/ })).toBeVisible()
  await expect.poll(() => pillOffset(group, piutang)).toBeLessThan(1)
})

test('dragging the pill chooses the option it is let go on', async ({ page }) => {
  const { group, hutang, piutang } = await openDebts(page)
  const from = await centerOf(hutang)
  const to = await centerOf(piutang)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 10 })
  await page.mouse.up()
  await expect(piutang).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('link', { name: /Budi/ })).toBeVisible()
  await expect.poll(() => pillOffset(group, piutang)).toBeLessThan(1)
})

test('only the real options are announced, not the copy inside the pill', async ({ page }) => {
  const { group } = await openDebts(page)
  await expect(group.getByRole('radio')).toHaveCount(2)
  await expect(group.locator('.liquid-pill')).toHaveAttribute('aria-hidden', 'true')
})
