import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Dummy values only — unit tests never talk to Google or a real database.
    env: {
      NODE_ENV: 'test',
      APP_URL: 'http://localhost:5173',
      DATABASE_URL: 'postgres://test:test@127.0.0.1:1/test',
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      ALLOWED_EMAILS: 'Owner@Example.com, second@example.com',
    },
  },
})
