import { createHmac } from 'node:crypto'
import { getHeader, getQuery, type H3Event, readBody, setHeaders } from 'h3'
import { runtimeConfig } from './runtimeConfig'

/**
 * Generate a CSRF token for the given session ID
 * @param sessionId The session ID to generate a token for
 * @returns The generated CSRF token
 */
export function generateCsrfToken(sessionId: string): string {
  if (!runtimeConfig.csrfSecret) {
    console.warn('CSRF secret is not configured. Using a default value for development only.')
  }

  const secret = runtimeConfig.csrfSecret || 'default-csrf-secret-for-development-only'
  const hmac = createHmac('sha256', secret)
  hmac.update(sessionId)

  // Generate a timestamp to make the token time-limited
  const timestamp = Date.now().toString()
  hmac.update(timestamp)

  const hash = hmac.digest('hex')
  return `${timestamp}.${hash}`
}

/**
 * Validate a CSRF token against the given session ID
 * @param token The CSRF token to validate
 * @param sessionId The session ID to validate against
 * @param maxAge Maximum age of the token in milliseconds (default: 1 hour)
 * @returns Whether the token is valid
 */
export function validateCsrfToken(token: string, sessionId: string, maxAge = 3600000): boolean {
  if (!token || !sessionId) {
    return false
  }

  const [timestamp, hash] = token.split('.')
  if (!timestamp || !hash) {
    return false
  }

  // Check if the token has expired
  const tokenTime = Number.parseInt(timestamp, 10)
  if (Number.isNaN(tokenTime) || Date.now() - tokenTime > maxAge) {
    return false
  }

  // Regenerate the token and compare
  const secret = runtimeConfig.csrfSecret || 'default-csrf-secret-for-development-only'
  const hmac = createHmac('sha256', secret)
  hmac.update(sessionId)
  hmac.update(timestamp)

  const expectedHash = hmac.digest('hex')
  return hash === expectedHash
}

/**
 * Get the CSRF token from the request
 * @param event The H3Event object
 * @returns The CSRF token or null if not found
 */
export async function getCsrfToken(event: H3Event): Promise<string | null> {
  // Check headers first (for API requests) - try both case variations
  const headerToken = getHeader(event, 'x-csrf-token') || getHeader(event, 'X-CSRF-Token')

  // Log all headers for debugging
  console.log('[CSRF Debug] Request headers:', event.node.req.headers)
  console.log('[CSRF Debug] Found token in header:', headerToken)

  if (headerToken) {
    return headerToken
  }

  // Then check form data (for form submissions)
  try {
    const body = await readBody(event)
    if (body && body._csrf) {
      return body._csrf
    }
  } catch {
    // If we can't read the body, continue to check query parameters
  }

  // Finally check query parameters (for GET requests)
  const query = getQuery(event)
  return (query._csrf as string) || null
}
