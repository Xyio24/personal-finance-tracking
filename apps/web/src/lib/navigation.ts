import { useLocation, useNavigate } from 'react-router'

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
