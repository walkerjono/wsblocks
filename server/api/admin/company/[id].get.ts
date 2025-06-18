import { eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { company } from '../../../database/schema'
import { requireAuth } from '../../../utils/auth'
import { getDB } from '../../../utils/db'
import { createSanitizedError } from '../../../utils/errorHandler'

export default defineEventHandler(async (event) => {
  // The middleware 1.auth.ts already checks if the user is an admin
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createSanitizedError(
      400,
      'Bad Request',
      new Error('Company ID is required'),
      'Company ID is required'
    )
  }

  try {
    const db = getDB()

    // Use the select method instead of query
    const result = await db.select()
      .from(company)
      .where(eq(company.id, id))
      .limit(1)

    if (!result || result.length === 0) {
      throw createSanitizedError(
        404,
        'Not Found',
        new Error('Company not found'),
        'Company not found'
      )
    }

    return {
      company: result[0]
    }
  } catch (error) {
    console.error('Error fetching company:', error)

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
      'Failed to fetch company'
    )
  }
})
