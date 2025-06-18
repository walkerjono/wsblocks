import { eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { company } from '../../../database/schema'
import { requireAuth } from '../../../utils/auth'
import { getDB } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  // The middleware 1.auth.ts already checks if the user is an admin
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Company ID is required'
    })
  }

  try {
    const db = getDB()

    // Use the select method instead of query
    const result = await db.select()
      .from(company)
      .where(eq(company.id, id))
      .limit(1)

    if (!result || result.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Company not found'
      })
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
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch company'
    })
  }
})
