import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Personal favicon that only lives on the owner's machine (gitignored, never committed).
 * When the file exists it replaces the default favicon; fresh clones just use favicon.svg.
 */
const LOCAL_FAVICON = 'my-face.svg'

function localFavicon(): Plugin {
  const exists = existsSync(fileURLToPath(new URL(`./public/${LOCAL_FAVICON}`, import.meta.url)))
  return {
    name: 'local-favicon',
    transformIndexHtml: (html) =>
      exists ? html.replace('href="/favicon.svg"', `href="/${LOCAL_FAVICON}"`) : html,
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localFavicon()],
  server: {
    port: 5173,
    strictPort: true,
    // Same-origin in development too: the browser only ever talks to :5173, so session
    // cookies and the Google OAuth callback behave exactly like in production.
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
})
