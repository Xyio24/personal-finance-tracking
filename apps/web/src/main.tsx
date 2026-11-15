import { onlineManager, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router'
import { App } from './App'
import './index.css'
import { isDemo } from './lib/demo'
import { setupKeyboardDetection } from './lib/keyboard'
import { setupNavigation } from './lib/navigation'
import { setupPwa } from './lib/pwa'
import { prefetchStartupData } from './lib/queries'
import { queryClient } from './lib/queryClient'

setupPwa()
setupNavigation()
setupKeyboardDetection()
// TanStack Query assumes "online" until the first online/offline event. Start from the real state
// so requests made while offline (e.g. opening the installed app) wait for the connection instead
// of failing; they resume by themselves once the device is back online.
onlineManager.setOnline(navigator.onLine)

// The demo build may be opened from a file, any static host or a sandboxed frame, so it keeps
// navigation in memory instead of touching the URL.
const Router = isDemo ? MemoryRouter : BrowserRouter

// Load Home's data alongside the session check instead of after it: one round trip less on
// every cold start. Without a session these simply fail with 401 and the login page shows.
if (!isDemo) prefetchStartupData()

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
