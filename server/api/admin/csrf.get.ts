import { getAuthSession } from '../../utils/auth'
import { generateCsrfToken } from '../../utils/csrf'
import { createSanitizedError } from '../../utils/errorHandler'

export default defineEventHandler(async (event) => {
  try {
    // Get the session
    const session = await getAuthSession(event)

    // If the user is authenticated, generate a CSRF token
    if (session?.user) {
      const csrfToken = generateCsrfToken(session.user.id)

      // Use lowercase header name for consistency
      setHeaders(event, {
        'x-csrf-token': csrfToken
      })

      console.log('[CSRF Debug] Generated token for user:', {
        userId: session.user.id,
        token: csrfToken
      })
    }

    // Return a simple response
    return {
      message: 'CSRF token initialized'
    }
  } catch (error) {
    console.error('Error initializing CSRF token:', error)

    // Check if the error is an H3Error or has a statusCode property
    if (error && (error as any).statusCode) {
      // Re-throw the original error to preserve the HTTP status
      throw error
    }

    // Only convert unknown errors to a 500 error
    throw createSanitizedError(
      500,
      'Internal Server Error',
      error,
      'Failed to initialize CSRF token'
    )
  }
})
