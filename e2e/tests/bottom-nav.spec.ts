import type { Page } from '@playwright/test'
import { expect, goTo, openApp, test } from './helpers'

type TabName = 'Beranda' | 'Transaksi' | 'Tabungan' | 'Hutang'

/** The glass pill in the bottom nav: its own box (its glass and lens scale around it). */
const pill = (page: Page) => page.locator('[data-bottom-nav] .tab-pill')
const tab = (page: Page, name: TabName) => page.getByRole('link', { name, exact: true })

async function center(page: Page, name: TabName) {
  const box = await tab(page, name).boundingBox()
  if (!box) throw new Error(`${name} is not on screen`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** How far the pill's center is from a tab's center, in px. */
async function pillOffset(page: Page, name: TabName) {
  const box = await pill(page).boundingBox()
  if (!box) return Number.POSITIVE_INFINITY
  return Math.abs(box.x + box.width / 2 - (await center(page, name)).x)
}

test('the glass pill marks the current tab and follows it', async ({ page }) => {
  await openApp(page)
  await expect.poll(() => pillOffset(page, 'Beranda')).toBeLessThan(1)
  await expect(tab(page, 'Beranda')).toHaveAttribute('aria-current', 'page')

  await goTo(page, 'Tabungan')
  await expect.poll(() => pillOffset(page, 'Tabungan')).toBeLessThan(1)

  // A page outside the tabs: no tab is marked. Coming back, the pill is there again.
  await goTo(page, 'Beranda')
  await page.getByRole('link', { name: 'Laporan' }).click()
  await expect(page.getByRole('heading', { name: 'Laporan', level: 1 })).toBeVisible()
  await expect(pill(page)).toHaveCSS('opacity', '0')
  await page.getByRole('button', { name: 'Kembali' }).click()
  await expect(pill(page)).toHaveCSS('opacity', '1')
  await expect.poll(() => pillOffset(page, 'Beranda')).toBeLessThan(1)
})

test('dragging the pill along the bar opens the tab it is let go on', async ({ page }) => {
  await openApp(page)
  const from = await center(page, 'Beranda')
  const to = await center(page, 'Hutang')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
  await expect(page.getByRole('heading', { name: 'Hutang & Piutang' })).toBeVisible()
  await expect.poll(() => pillOffset(page, 'Hutang')).toBeLessThan(1)

  // Dragged out and back, the pill stays put and nothing opens.
  const back = await center(page, 'Tabungan')
  await page.mouse.move(to.x, to.y)
  await page.mouse.down()
  await page.mouse.move(back.x, back.y, { steps: 6 })
  await page.mouse.move(to.x, to.y, { steps: 6 })
  await page.mouse.up()
  await expect(tab(page, 'Hutang')).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => pillOffset(page, 'Hutang')).toBeLessThan(1)
})

test('a press that wobbles a little is still a tap', async ({ page }) => {
  await openApp(page)
  const at = await center(page, 'Transaksi')
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.move(at.x + 4, at.y)
  await page.mouse.up()
  await expect(page.getByRole('heading', { name: 'Transaksi', level: 1 })).toBeVisible()
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the pill moves without sliding', async ({ page }) => {
    await openApp(page)
    await goTo(page, 'Hutang')
    // The very next frame it is there already: no spring to wait for.
    await page.evaluate(() => new Promise(requestAnimationFrame))
    expect(await pillOffset(page, 'Hutang')).toBeLessThan(1)
  })
})
