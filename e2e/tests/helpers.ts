import { test as base, expect, type Page } from '@playwright/test'

/**
 * Every test also fails when the browser logs an error or throws, even if the screen looked
 * fine: React recovering from a render error, a failed request, a crash in an event handler.
 */
export const test = base.extend<{ failOnBrowserErrors: undefined }>({
  failOnBrowserErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', (error) => errors.push(error.message))
      await use(undefined)
      expect(errors, 'errors in the browser console').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** "Rp 1.250.000" → 1250000, "−Rp 600.000" → -600000 */
export function rupiah(text: string): number {
  const value = Number(text.replace(/[^\d]/g, ''))
  return /^\s*[−-]/.test(text) ? -value : value
}

/** Opens the demo on Home. Every page load starts from fresh sample data. */
export async function openApp(page: Page) {
  await page.goto('/')
  await expect(page.getByText('Kekayaan bersih')).toBeVisible()
}

export async function netWorth(page: Page) {
  const hero = page.getByRole('region', { name: 'Kekayaan bersih' })
  return rupiah((await hero.locator('p').nth(1).textContent()) ?? '')
}

export async function goTo(page: Page, tab: 'Beranda' | 'Transaksi' | 'Tabungan' | 'Hutang') {
  await page.getByRole('link', { name: tab, exact: true }).click()
}
