import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
