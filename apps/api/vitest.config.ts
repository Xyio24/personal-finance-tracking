import { configDefaults, defineConfig } from 'vitest/config'
import { testEnv } from './src/test/env'

// Unit tests: no database. Integration tests (*.int.test.ts) have their own config.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'src/**/*.int.test.ts'],
    env: { ...testEnv, DATABASE_URL: 'postgres://test:test@127.0.0.1:1/test' },
  },
})
