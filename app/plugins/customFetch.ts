import { globalCsrf } from '../composables/useCsrf'

export default defineNuxtPlugin(() => {
  const $customFetch = $fetch.create({
    onRequest({ request, options }) {
      // Add CSRF token to headers if available
      if (globalCsrf.csrfToken.value) {
        options.headers = options.headers || {}
        // @ts-expect-error - Type issues with headers
        options.headers['x-csrf-token'] = globalCsrf.csrfToken.value

        // Log the request for debugging
        console.log('[CSRF Debug] Adding token to request:', {
          url: request,
          token: globalCsrf.csrfToken.value,
          headers: options.headers
        })
      } else {
        console.warn('[CSRF Warning] No CSRF token available for request:', request)
      }
    },
    onResponse({ response }) {
      // Update CSRF token from response headers
      globalCsrf.updateCsrfToken(response)
    }
  })
  // Expose to useNuxtApp().$customFetch
  return {
    provide: {
      customFetch: $customFetch
    }
  }
})
