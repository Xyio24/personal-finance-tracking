import {
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router'
import { App } from './App'
import './index.css'
import { meKey } from './lib/auth'
import { isDemo } from './lib/demo'
import { ApiError } from './lib/errors'
import { setupNavigation } from './lib/navigation'
import { setupPwa } from './lib/pwa'

setupPwa()
setupNavigation()
// TanStack Query assumes "online" until the first online/offline event. Start from the real state
// so requests made while offline (e.g. opening the installed app) wait for the connection instead
// of failing; they resume by themselves once the device is back online.
onlineManager.setOnline(navigator.onLine)

// The demo build may be opened from a file, any static host or a sandboxed frame, so it keeps
// navigation in memory instead of touching the URL.
const Router = isDemo ? MemoryRouter : BrowserRouter

// A 401 anywhere means the session ended: forget the user so <RequireAuth> shows the login page.
const onError = (error: Error) => {
  if (error instanceof ApiError && error.status === 401) queryClient.setQueryData(meKey, null)
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      // Retrying cannot fix a 4xx (bad input, missing data, expired session).
      retry: (failureCount, error) =>
        failureCount < 1 && !(error instanceof ApiError && error.status < 500),
    },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
      </Router>
    </QueryClientProvider>
  </StrictMode>,
)
