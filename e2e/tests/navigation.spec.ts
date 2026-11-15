import type { Page } from '@playwright/test'
import { expect, goTo, openApp, test } from './helpers'

/** Page entrances, back animation and scroll positions. */

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY))

async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), y)
  await expect.poll(() => scrollY(page)).toBe(y)
}

/** Opens the Transaksi tab and waits until its list (not Home's) is on screen. */
async function openTransactions(page: Page) {
  await goTo(page, 'Transaksi')
  await expect(page.getByRole('heading', { name: 'Transaksi', level: 1 })).toBeVisible()
  const rows = page.locator('[data-page-frame] li a[href]')
  await expect(rows.first()).toBeVisible()
  return rows
}

/** First keyframe of the page frame's running entrance (slowed down so it can be read). */
async function entrance(page: Page) {
  return page.evaluate(() => {
    const frame = document.querySelector('[data-page-frame]')
    const effect = frame?.getAnimations()[0]?.effect as KeyframeEffect | undefined
    const first = effect?.getKeyframes()[0]
    return first ? { transform: first.transform ?? null, opacity: first.opacity } : null
  })
}

test('going back returns to the same spot in the list; a new page starts at the top', async ({
  page,
}) => {
  await openApp(page)
  const rows = await openTransactions(page)
  await scrollTo(page, 400)

  // A tap first scrolls the row into view if needed: measure where the user really is.
  const row = rows.filter({ hasText: /Rp/ }).nth(6)
  await row.scrollIntoViewIfNeeded()
  const before = await scrollY(page)
  expect(before).toBeGreaterThan(0)
  await row.click()
  await expect(page.getByRole('heading', { name: 'Ubah transaksi' })).toBeVisible()
  await expect.poll(() => scrollY(page)).toBe(0)

  await page.getByRole('button', { name: 'Kembali' }).click()
  await expect(page.getByRole('heading', { name: 'Transaksi', level: 1 })).toBeVisible()
  await expect.poll(() => scrollY(page)).toBe(before)
})

test('switching the month keeps the place; switching tabs starts at the top', async ({ page }) => {
  await openApp(page)
  await openTransactions(page)
  await scrollTo(page, 60)
  await page.getByRole('button', { name: 'Bulan sebelumnya' }).click()
  await expect(page.getByText(/Oktober 2026/).first()).toBeVisible()
  expect(await scrollY(page)).toBe(60)

  await scrollTo(page, 300)
  await goTo(page, 'Tabungan')
  await expect.poll(() => scrollY(page)).toBe(0)
})

test('tapping the tab you are on scrolls back to the top', async ({ page }) => {
  await openApp(page)
  await openTransactions(page)
  await scrollTo(page, 200)
  await goTo(page, 'Transaksi')
  await expect.poll(() => scrollY(page)).toBe(0)
})

test('pages slide in from the right going deeper and from the left going back', async ({
  page,
}) => {
  await openApp(page)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Animation.enable')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.05 })

  await goTo(page, 'Hutang')
  await expect.poll(() => entrance(page)).toMatchObject({ transform: null }) // tabs only fade
  await expect(page.getByRole('heading', { name: 'Hutang & Piutang' })).toBeVisible()

  await page.getByRole('link', { name: /Kakak/ }).click()
  await expect.poll(() => entrance(page)).toMatchObject({ transform: 'translateX(32px)' })
  // The slide never makes the page scroll sideways.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)

  await page.getByRole('button', { name: 'Kembali' }).click()
  await expect.poll(() => entrance(page)).toMatchObject({ transform: 'translateX(-32px)' })
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 })
})

test('the Piutang tab is still selected after opening a piutang and coming back', async ({
  page,
}) => {
  await openApp(page)
  await goTo(page, 'Hutang')
  await page.getByRole('radio', { name: /^Piutang/ }).click()
  await page.getByRole('link', { name: /Budi/ }).click()
  await page.getByRole('button', { name: 'Kembali' }).click()
  await expect(page.getByRole('radio', { name: /^Piutang/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('pages only fade', async ({ page }) => {
    await openApp(page)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Animation.enable')
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.05 })
    await goTo(page, 'Hutang')
    await expect(page.getByRole('heading', { name: 'Hutang & Piutang' })).toBeVisible()
    await page.getByRole('link', { name: /Kakak/ }).click()
    await expect.poll(() => entrance(page)).toMatchObject({ transform: null, opacity: '0' })
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 })
  })
})

test('tapping the tab you are on at the top changes nothing', async ({ page }) => {
  await openApp(page)
  await goTo(page, 'Hutang')
  await page.getByRole('radio', { name: /^Piutang/ }).click()
  await goTo(page, 'Hutang')
  await expect(page.getByRole('radio', { name: /^Piutang/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})
