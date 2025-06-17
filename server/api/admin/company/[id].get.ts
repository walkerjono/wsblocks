import { eq } from 'drizzle-orm'
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
    console.log('DB:', db)

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
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch company'
    })
  }
})
