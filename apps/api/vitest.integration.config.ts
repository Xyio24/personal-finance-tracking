import { defineConfig } from 'vitest/config'
import { TEST_DATABASE_URL, testEnv } from './src/test/env'

// Integration tests against a real PostgreSQL (`npm run db:up` locally, a service in CI).
export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts'],
    globalSetup: ['./src/test/global-setup.ts'],
    // Files share one database and reset it between tests, so run them one at a time.
    fileParallelism: false,
    env: { ...testEnv, DATABASE_URL: TEST_DATABASE_URL },
  },
})
