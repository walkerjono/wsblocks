import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'

// Define company type enum
export const companyTypeEnum = pgEnum('company_type', ['customer'])

export const company = pgTable('company', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  type: companyTypeEnum('type').notNull(),
  isActive: boolean('is_active').default(true),
  externalReference: text('external_reference'),
  createdAt: timestamp('created_at').notNull().$default(() => new Date()),
  createdBy: uuid('created_by').notNull().references(() => user.id, { onDelete: 'restrict' }),
  updatedAt: timestamp('updated_at').notNull().$default(() => new Date()),
  updatedBy: uuid('updated_by').notNull().references(() => user.id, { onDelete: 'restrict' })
})
