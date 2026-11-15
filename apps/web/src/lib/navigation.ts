import { monthKeyPattern, toMonthKey } from '@finance/shared'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { isDemo } from './demo'
import { isIos } from './pwa'

let backButtonAt = Number.NEGATIVE_INFINITY
let browserAnimatedPop = false

/** Call once at startup, before the router mounts, so this listener runs before React Router's. */
export function setupNavigation() {
  // NavigationEffects restores scroll (it waits for lists to load); the browser's own attempt
  // would jump first. Not in the demo, which may run inside a sandboxed frame.
  if (!isDemo) {
    try {
      window.history.scrollRestoration = 'manual'
    } catch {
      // unavailable: keep the browser's
    }
  }
  window.addEventListener(
    'popstate',
    (event) => {
      const fromBackButton = performance.now() - backButtonAt < 1000
      backButtonAt = Number.NEGATIVE_INFINITY
      const uaAnimated =
        (event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition ===
        true
      // iOS 17 has no hasUAVisualTransition and an installed app has no browser back button: a
      // back that didn't come from our arrow was Safari's edge swipe, which already animated.
      browserAnimatedPop = !fromBackButton && (uaAnimated || isIos())
    },
    { capture: true },
  )
}

/** Whether the browser itself animated the latest back/forward (read during the POP's commit). */
export const lastPopWasBrowserAnimated = () => browserAnimatedPop

/**
 * Go back like the phone's back button when the user arrived from inside the app; when the
 * page was opened directly (no in-app history), go to `fallback` instead of leaving the app.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    if (location.key !== 'default') {
      backButtonAt = performance.now()
      navigate(-1)
    } else {
      navigate(fallback, { replace: true })
    }
  }
}

/**
 * The month shown on a page, kept in ?bulan=YYYY-MM so back navigation and links return to
 * the same month. The current month leaves the parameter out. Other parameters are kept.
 */
export function useMonthParam() {
  const [params, setParams] = useSearchParams()
  const currentMonth = toMonthKey(new Date())
  const requested = params.get('bulan') ?? ''
  const month = monthKeyPattern.test(requested) ? requested : currentMonth

  const setMonth = (next: string) =>
    setParams(
      (previous) => {
        const updated = new URLSearchParams(previous)
        if (next === currentMonth) updated.delete('bulan')
        else updated.set('bulan', next)
        return updated
      },
      { replace: true },
    )

  return [month, setMonth, currentMonth] as const
}

/**
 * A choice kept in the URL (e.g. the Hutang/Piutang tab), so it is still selected after
 * opening an item and coming back. The fallback leaves the parameter out.
 */
export function useChoiceParam<T extends string>(
  name: string,
  choices: Record<T, string>,
  fallback: T,
) {
  const [params, setParams] = useSearchParams()
  const raw = params.get(name)
  const value = (Object.keys(choices) as T[]).find((choice) => choices[choice] === raw) ?? fallback

  const setValue = (next: T) =>
    setParams(
      (previous) => {
        const updated = new URLSearchParams(previous)
        if (next === fallback) updated.delete(name)
        else updated.set(name, choices[next])
        return updated
      },
      { replace: true },
    )

  return [value, setValue] as const
}
