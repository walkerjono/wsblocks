import type { H3Error } from 'h3'
import { runtimeConfig } from './runtimeConfig'

/**
 * Sanitize error messages for production environments
 * @param error The error object
 * @param defaultMessage The default message to show in production
 * @returns A sanitized error message
 */
export function sanitizeErrorMessage(error: Error | unknown, defaultMessage = 'An unexpected error occurred'): string {
  // If sanitizeErrors is enabled, return a generic message in production
  if (runtimeConfig.sanitizeErrors === 'true' && process.env.NODE_ENV === 'production') {
    return defaultMessage
  }

  // Otherwise, return the actual error message
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

/**
 * Create a sanitized error response
 * @param statusCode HTTP status code
 * @param statusMessage HTTP status message
 * @param error The original error
 * @param defaultMessage Default message to show in production
 * @returns An H3Error object with sanitized message
 */
export function createSanitizedError(
  statusCode: number,
  statusMessage: string,
  error: Error | unknown,
  defaultMessage = 'An unexpected error occurred'
): H3Error {
  return createError({
    statusCode,
    statusMessage,
    message: sanitizeErrorMessage(error, defaultMessage)
  })
}
