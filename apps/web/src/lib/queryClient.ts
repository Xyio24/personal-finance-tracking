import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { meKey } from './auth'
import { ApiError } from './errors'

// A 401 anywhere means the session ended: forget the user so <RequireAuth> shows the login page.
const onError = (error: Error) => {
  if (error instanceof ApiError && error.status === 401) queryClient.setQueryData(meKey, null)
}

/**
 * The app's one query client. A module (not created inside a component) so work that outlives
 * a screen, like "Urungkan" in a toast after its form has closed, can still refresh the data.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      // Retrying cannot fix a 4xx (bad input, missing data, expired session).
      retry: (failureCount, error) =>
        failureCount < 1 && !(error instanceof ApiError && error.status < 500),
    },
    // Nothing is stored offline, so a change made without a connection must fail visibly and be
    // retried by the user, not wait silently and save minutes later (possibly twice).
    mutations: { networkMode: 'always' },
  },
})
