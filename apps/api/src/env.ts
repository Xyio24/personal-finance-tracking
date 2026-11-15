import { z } from 'zod'
import { parseEmailList } from './auth/allowlist'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Public URL the browser uses, e.g. https://finance.example.com (no trailing slash). */
  APP_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  /** Comma separated Google accounts that may log in. Everyone else is rejected. */
  ALLOWED_EMAILS: z
    .string()
    .transform(parseEmailList)
    .refine((list) => list.length > 0, 'must contain at least one email'),
  /** Folder with the built web app. Only set in production (the API then serves the SPA). */
  STATIC_DIR: z.string().optional(),
  MIGRATIONS_DIR: z.string().default('drizzle'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Print only the variable names and what is wrong — never the values, they may be secrets.
  const problems = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
  )
  console.error(`Invalid environment variables:\n${problems.join('\n')}`)
  process.exit(1)
}

export const env = parsed.data

/** Cookies get the Secure flag whenever the app is served over HTTPS. */
export const isSecureCookie = env.APP_URL.startsWith('https://')
