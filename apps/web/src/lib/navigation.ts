import { monthKeyPattern, toMonthKey } from '@finance/shared'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

/**
 * Go back like the phone's back button when the user arrived from inside the app; when the
 * page was opened directly (no in-app history), go to `fallback` instead of leaving the app.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(fallback, { replace: true })
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
