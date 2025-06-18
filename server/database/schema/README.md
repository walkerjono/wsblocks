# Database Schema Rules

## Rules

1. `DEFAULT_FIELDS`: All tables should have the following fields created by default:
   - id: uuid('id').primaryKey(),
   - name: text('name').notNull(),
   - <`TABLE_SPECIFIC_FIELDS` go here>
   - isActive: boolean('is_active').default(true),
   - externalReference: text('external_reference'),
   - createdAt: timestamp('created_at').defaultNow().notNull(),
   - createdBy: uuid('created_by').notNull().references(() => user.id, { onDelete: 'restrict' }),
   - updatedAt: timestamp('updated_at').defaultNow().notNull(),
   - updatedBy: uuid('updated_by').notNull().references(() => user.id, { onDelete: 'restrict' })

2. `TABLE_SPECIFIC_FIELDS` should be added between `name` and `isActive`
3. Relationship columns should be named like <sourceTable>Id e.g. `companyId`, except for `createdBy` and `updatedBy`
4. Date columns should be named as follows:
   - <context>Date (dateonly) e.g. Invoice Date as `invoiceDate`
   - <context>DateTime (datetime) e.g. Follow Up as `followUpDateTime`