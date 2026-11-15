import { Google } from 'arctic'
import { z } from 'zod'
import { env } from '../env'

export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback'

export const google = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.APP_URL}${GOOGLE_CALLBACK_PATH}`,
)

export const GOOGLE_SCOPES = ['openid', 'email', 'profile']

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

/**
 * Claims we rely on from Google's ID token. The token comes straight from Google's token
 * endpoint over TLS (authenticated with our client secret), so per OpenID Connect we may skip
 * signature checks — but we still confirm it was issued by Google for *our* client.
 */
export const googleClaimsSchema = z
  .object({
    iss: z.string(),
    aud: z.string(),
    sub: z.string().min(1),
    email: z.email(),
    email_verified: z.boolean(),
    name: z.string().optional(),
    picture: z.url().optional(),
  })
  .refine((claims) => GOOGLE_ISSUERS.includes(claims.iss), 'unexpected issuer')
  .refine((claims) => claims.aud === env.GOOGLE_CLIENT_ID, 'token issued for another client')

export type GoogleClaims = z.infer<typeof googleClaimsSchema>
