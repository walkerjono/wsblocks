import type { H3Event } from 'h3'
import { isRateLimited } from '../utils/rateLimit'
import { runtimeConfig } from '../utils/runtimeConfig'

export default defineEventHandler(async (event: H3Event) => {
  const path = event.path

  // Only apply rate limiting to admin API routes
  if (!path?.startsWith('/api/admin')) {
    return
  }

  // Check if the request is rate limited
  if (isRateLimited(event, 'admin-api')) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.'
    })
  }
})
