import { globalCsrf } from '../composables/useCsrf'

/**
 * Client-side middleware to initialize CSRF token
 * This middleware fetches a CSRF token from the server on initial page load
 */
export default defineNuxtRouteMiddleware(async () => {
  try {
    // Always refresh the CSRF token on route change for admin pages
    // Make a GET request to the CSRF endpoint to get a CSRF token
    await $fetch('/api/admin/csrf', {
      method: 'GET',
      credentials: 'include'
    })

    // Check if the token was set
    if (globalCsrf.csrfToken.value) {
      console.log('[CSRF Debug] Token initialized:', globalCsrf.csrfToken.value)
    } else {
      console.warn('[CSRF Warning] Token not set after initialization')

      // Try to manually extract the token from the response headers
      const nuxtApp = useNuxtApp()
      if (nuxtApp.$customFetch) {
        // Force a simple request to get fresh headers
        const refreshResponse = await nuxtApp.$customFetch('/api/admin/csrf', {
          method: 'GET',
          credentials: 'include'
        })

        console.log('[CSRF Debug] Refresh response:', refreshResponse)
      }
    }
  } catch (error) {
    console.error('[CSRF Error] Failed to initialize CSRF token:', error)
  }
})
