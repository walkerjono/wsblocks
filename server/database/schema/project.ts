import { boolean, date, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { company } from './company'

// Define scheduling direction enum
export const schedulingDirectionEnum = pgEnum('scheduling_direction', ['forward', 'backward'])

// Define scheduling mode enum
export const schedulingModeEnum = pgEnum('scheduling_mode', ['Normal', 'FixedDuration', 'FixedEffort', 'FixedUnits'])

export const project = pgTable('project', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  companyId: uuid('company_id').notNull().references(() => company.id, { onDelete: 'restrict' }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  schedulingDirection: schedulingDirectionEnum('scheduling_direction').default('forward').notNull(),
  schedulingMode: schedulingModeEnum('scheduling_mode').default('Normal').notNull(),
  isEffortDriven: boolean('is_effort_driven').default(false),
  isActive: boolean('is_active').default(true),
  externalReference: text('external_reference'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull().references(() => user.id, { onDelete: 'restrict' }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').notNull().references(() => user.id, { onDelete: 'restrict' })
})
