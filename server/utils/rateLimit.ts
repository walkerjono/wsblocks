import { getHeader, type H3Event, setHeaders } from 'h3'
import { runtimeConfig } from './runtimeConfig'

// Simple in-memory store for rate limiting
// In production, this should be replaced with Redis or another distributed cache
const rateLimitStore = new Map<string, { count: number, resetTime: number }>()

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}

// Clean up expired entries every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000)

/**
 * Get the client IP address from the request
 * @param event The H3Event object
 * @returns The client IP address
 */
export function getClientIp(event: H3Event): string {
  const xForwardedFor = getHeader(event, 'x-forwarded-for')
  if (xForwardedFor) {
    // Get the first IP in the list (client IP)
    return xForwardedFor.split(',')[0].trim()
  }

  return event.node.req.socket.remoteAddress || '0.0.0.0'
}

/**
 * Check if a request is rate limited
 * @param event The H3Event object
 * @param prefix A prefix for the rate limit key
 * @param max Maximum number of requests per window
 * @param windowSeconds Time window in seconds
 * @returns Whether the request is rate limited
 */
export function isRateLimited(
  event: H3Event,
  prefix: string,
  max: number = Number(runtimeConfig.rateLimitMax || 100),
  windowSeconds: number = Number(runtimeConfig.rateLimitWindow || 60)
): boolean {
  const ip = getClientIp(event)
  const key = `${prefix}:${ip}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key)
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + windowMs }
    rateLimitStore.set(key, entry)
  }

  // Increment count
  entry.count++

  // Set rate limit headers
  setHeaders(event, {
    'X-RateLimit-Limit': max.toString(),
    'X-RateLimit-Remaining': Math.max(0, max - entry.count).toString(),
    'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
  })

  // Check if rate limited
  if (entry.count > max) {
    setHeaders(event, {
      'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString()
    })
    return true
  }

  return false
}
