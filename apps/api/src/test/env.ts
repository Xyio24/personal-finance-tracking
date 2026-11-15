/**
 * Environment for tests. Dummy values only — tests never talk to Google, and integration
 * tests use their own throwaway database (created automatically, never the dev database).
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://finance:finance@localhost:5433/finance_test'

export const testEnv = {
  NODE_ENV: 'test',
  APP_URL: 'http://localhost:5173',
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  ALLOWED_EMAILS: 'Owner@Example.com, second@example.com',
}
