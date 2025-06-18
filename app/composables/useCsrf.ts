import { ref } from 'vue'

/**
 * Composable for handling CSRF tokens
 * @returns Functions and state for CSRF token management
 */
export function useCsrf() {
  const csrfToken = ref<string | null>(null)

  /**
   * Get the CSRF token from the response headers and store it
   * @param response The response object
   */
  function updateCsrfToken(response: Response | undefined) {
    if (!response)
      return

    // Try different case variations for the header name
    const token = response.headers.get('X-CSRF-Token') ||
      response.headers.get('x-csrf-token')

    console.log('[CSRF Debug] Response headers:', {
      headers: Array.from(response.headers.entries()),
      foundToken: token
    })

    if (token) {
      console.log('[CSRF Debug] Setting CSRF token:', token)
      csrfToken.value = token
    } else {
      console.warn('[CSRF Warning] No CSRF token found in response headers')
    }
  }

  /**
   * Get the CSRF token headers for a request
   * @returns Headers object with CSRF token if available
   */
  function getCsrfHeaders(): HeadersInit {
    if (!csrfToken.value) {
      return {}
    }

    // Use lowercase header name for consistency
    return {
      'x-csrf-token': csrfToken.value
    }
  }

  return {
    csrfToken,
    updateCsrfToken,
    getCsrfHeaders
  }
}

// Create a global instance for app-wide use
export const globalCsrf = useCsrf()
