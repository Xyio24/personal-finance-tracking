import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Personal favicon that only lives on the owner's machine (gitignored, never committed).
 * When the file exists it replaces the default favicon; fresh clones just use favicon.svg.
 * Demo builds are made to be shared, so they never use or contain it.
 */
const LOCAL_FAVICON = 'my-face.svg'

function localFavicon(): Plugin {
  const exists = existsSync(fileURLToPath(new URL(`./public/${LOCAL_FAVICON}`, import.meta.url)))
  let demoBuild = false
  let outDir = ''

  return {
    name: 'local-favicon',
    configResolved(config) {
      demoBuild = config.command === 'build' && config.mode === 'demo'
      outDir = path.resolve(config.root, config.build.outDir)
    },
    transformIndexHtml: (html) =>
      exists && !demoBuild ? html.replace('href="/favicon.svg"', `href="/${LOCAL_FAVICON}"`) : html,
    // Vite copies everything in public/ into the build; drop the photo from demo builds.
    closeBundle() {
      if (demoBuild) rmSync(path.join(outDir, LOCAL_FAVICON), { force: true })
    },
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
