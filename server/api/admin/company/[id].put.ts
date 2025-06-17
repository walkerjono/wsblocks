import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { company } from '../../../database/schema'
import { logAuditEvent } from '../../../utils/auditLogger'
import { requireAuth } from '../../../utils/auth'
import { getDB } from '../../../utils/db'

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
    console.log('Session:', session)

    id = getRouterParam(event, 'id')
    console.log('Company ID:', id)
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Company ID is required'
      })
    }

    const body = await readValidatedBody(event, body => schema.parse(body))
    console.log('Request body:', body)
    const db = getDB()

    // Check if company exists
    const existingCompany = await db.select()
      .from(company)
      .where(eq(company.id, id))
      .limit(1)

    if (!existingCompany || existingCompany.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Company not found'
      })
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
      category: 'auth',
      action: 'update',
      targetType: 'email',
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
        category: 'auth',
        action: 'update',
        targetType: 'email',
        targetId: id || 'unknown',
        status: 'failure',
        details: error instanceof Error ? error.message : String(error)
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: `Failed to update company: ${error instanceof Error ? error.message : String(error)}`
    })
  }
})
