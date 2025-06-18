import { v7 as uuidv7 } from 'uuid'
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
  // The middleware 1.auth.ts already checks if the user is an admin
  const session = await requireAuth(event)

  const body = await readValidatedBody(event, body => schema.parse(body))
  const db = getDB()

  const now = new Date()
  const companyId = uuidv7()

  try {
    const newCompany = await db.insert(company).values({
      id: companyId,
      name: body.name,
      type: body.type,
      isActive: body.isActive,
      externalReference: body.externalReference || null,
      createdAt: now,
      createdBy: session.user.id,
      updatedAt: now,
      updatedBy: session.user.id
    }).returning()

    await logAuditEvent({
      userId: session.user.id,
      category: 'company',
      action: 'create',
      targetType: 'company',
      targetId: companyId,
      status: 'success'
    })

    return {
      company: newCompany[0]
    }
  } catch (error) {
    console.error('Error creating company:', error)

    await logAuditEvent({
      userId: session.user.id,
      category: 'company',
      action: 'create',
      targetType: 'company',
      targetId: companyId,
      status: 'failure',
      details: error instanceof Error ? error.message : String(error)
    })

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
      'Failed to create company'
    )
  }
})
