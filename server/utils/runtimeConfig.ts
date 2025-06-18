import type { NitroRuntimeConfig } from 'nitropack/types'
import { config } from 'dotenv'

let runtimeConfigInstance: NitroRuntimeConfig

export const generateRuntimeConfig = () => ({
  preset: process.env.NUXT_NITRO_PRESET,
  betterAuthSecret: process.env.NUXT_BETTER_AUTH_SECRET,
  // Security
  csrfSecret: process.env.NUXT_CSRF_SECRET,
  rateLimitMax: Number.parseInt(process.env.NUXT_RATE_LIMIT_MAX || '100', 10),
  rateLimitWindow: Number.parseInt(process.env.NUXT_RATE_LIMIT_WINDOW || '60', 10),
  sanitizeErrors: process.env.NUXT_SANITIZE_ERRORS,
  // Stripe
  stripeEnabled: process.env.NUXT_STRIPE_ENABLED,
  stripeSecretKey: process.env.NUXT_STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.NUXT_STRIPE_WEBHOOK_SECRET,
  stripePriceIdProMonth: process.env.NUXT_STRIPE_PRICE_ID_PRO_MONTH,
  stripePriceIdProYear: process.env.NUXT_STRIPE_PRICE_ID_PRO_YEAR,
  // Resend
  resendApiKey: process.env.NUXT_RESEND_API_KEY,
  // Github
  githubClientId: process.env.NUXT_GH_CLIENT_ID,
  githubClientSecret: process.env.NUXT_GH_CLIENT_SECRET,
  // Google
  googleClientId: process.env.NUXT_GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.NUXT_GOOGLE_CLIENT_SECRET,
  // DB
  redisEnabled: process.env.NUXT_REDIS_ENABLED,
  redisUrl: process.env.NUXT_REDIS_URL,
  databaseUrl: process.env.NUXT_DATABASE_URL,
  public: {
    baseURL: process.env.NUXT_APP_URL,
    appName: process.env.NUXT_APP_NAME,
    appEnv: process.env.NODE_ENV,
    appRepo: process.env.NUXT_APP_REPO,
    appNotifyEmail: process.env.NUXT_APP_NOTIFY_EMAIL,
    appContactEmail: process.env.NUXT_APP_CONTACT_EMAIL,
    auth: {
      redirectUserTo: '/',
      redirectGuestTo: '/signin'
    }
  }
})

if (typeof useRuntimeConfig !== 'undefined') {
  runtimeConfigInstance = useRuntimeConfig()
} else {
  // for cli: npm run auth:schema
  config()
  runtimeConfigInstance = generateRuntimeConfig() as any as NitroRuntimeConfig
}

export const runtimeConfig = runtimeConfigInstance
