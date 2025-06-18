import { v7 as uuidv7 } from 'uuid'
import { z } from 'zod'
import { project } from '../../../database/schema'
import { logAuditEvent } from '../../../utils/auditLogger'
import { requireAuth } from '../../../utils/auth'
import { getDB } from '../../../utils/db'

const schema = z.object({
  name: z.string().min(4),
  companyId: z.string().uuid(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  tags: z.string().optional(),
  isActive: z.boolean(),
  externalReference: z.string().optional()
})

export default defineEventHandler(async (event) => {
  // The middleware 1.auth.ts already checks if the user is an admin
  const session = await requireAuth(event)

  const body = await readValidatedBody(event, body => schema.parse(body))
  const db = getDB()

  const now = new Date()
  const projectId = uuidv7()

  try {
    // Insert a new project record
    const newProject = await db.insert(project).values({
      id: projectId,
      name: body.name,
      companyId: body.companyId,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      schedulingDirection: 'forward',
      schedulingMode: 'Normal',
      isEffortDriven: false,
      tags: body.tags || null,
      isActive: body.isActive,
      externalReference: body.externalReference || null,
      createdAt: now,
      createdBy: session.user.id,
      updatedAt: now,
      updatedBy: session.user.id
    }).returning()

    await logAuditEvent({
      userId: session.user.id,
      category: 'project',
      action: 'create',
      targetType: 'project',
      targetId: projectId,
      status: 'success'
    })

    return {
      project: newProject[0]
    }
  } catch (error) {
    console.error('Error creating project:', error)

    await logAuditEvent({
      userId: session.user.id,
      category: 'project',
      action: 'create',
      targetType: 'project',
      targetId: projectId,
      status: 'failure',
      details: error instanceof Error ? error.message : String(error)
    })

    // Check if the error is an H3Error or has a statusCode property
    if (error && (error as any).statusCode) {
      // Re-throw the original error to preserve the HTTP status
      throw error
    }

    // Only convert unknown errors to a 500 error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to create project'
    })
  }
})
