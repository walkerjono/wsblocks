import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { company } from '../../../database/schema'
import { logAuditEvent } from '../../../utils/auditLogger'
import { requireAuth } from '../../../utils/auth'
import { getDB } from '../../../utils/db'
import { createSanitizedError } from '../../../utils/errorHandler'

const schema = z.object({
  name: z.string().min(4),
  type: z.enum(['customer']),
  isActive: z.boolean(),
  externalReference: z.string().optional()
})

export default defineEventHandler(async (event) => {
  // Declare variables at the top level so they're accessible in the catch block
  let session
  let id

  try {
    // The middleware 1.auth.ts already checks if the user is an admin
    session = await requireAuth(event)

    id = getRouterParam(event, 'id')
    if (!id) {
      throw createSanitizedError(
        400,
        'Bad Request',
        new Error('Company ID is required'),
        'Company ID is required'
      )
    }

    const body = await readValidatedBody(event, body => schema.parse(body))
    const db = getDB()

    // Check if company exists
    const existingCompany = await db.select()
      .from(company)
      .where(eq(company.id, id))
      .limit(1)

    if (!existingCompany || existingCompany.length === 0) {
      throw createSanitizedError(
        404,
        'Not Found',
        new Error('Company not found'),
        'Company not found'
      )
    }

    const now = new Date()

    const updatedCompany = await db.update(company)
      .set({
        name: body.name,
        type: body.type,
        isActive: body.isActive,
        externalReference: body.externalReference || null,
        updatedAt: now,
        updatedBy: session.user.id
      })
      .where(eq(company.id, id))
      .returning()

    console.log('Updated company:', updatedCompany)

    await logAuditEvent({
      userId: session.user.id,
      category: 'company',
      action: 'update',
      targetType: 'company',
      targetId: id,
      status: 'success'
    })

    return {
      company: updatedCompany[0]
    }
  } catch (error) {
    console.error('Error updating company:', error)

    // Only log audit event if session exists
    if (typeof session !== 'undefined' && session.user) {
      await logAuditEvent({
        userId: session.user.id,
        category: 'company',
        action: 'update',
        targetType: 'company',
        targetId: id || 'unknown',
        status: 'failure',
        details: error instanceof Error ? error.message : String(error)
      })
    }

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
      'Failed to update company'
    )
  }
})
