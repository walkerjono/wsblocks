import type { SQL } from 'drizzle-orm'
import type { PgSelect } from 'drizzle-orm/pg-core'
import { asc, desc, getTableColumns, sql } from 'drizzle-orm'
import { z } from 'zod'
import { company, project } from '~~/server/database/schema'
import { filterSchema, processFilters, withFilters } from '~~/server/utils/query'

function withSorts<T extends PgSelect>(
  qb: T,
  sorts: SQL[]
) {
  return qb.orderBy(...sorts)
}

function withPagination<T extends PgSelect>(
  qb: T,
  page: number = 1,
  pageSize: number = 10
) {
  return qb.limit(pageSize).offset((page - 1) * pageSize)
}

const sortSchema = z.array(
  z.tuple([
    z.string(),
    z.enum(['asc', 'desc'])
  ])
)

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  filter: z.string()
    .transform((str) => {
      try {
        const parsed = JSON.parse(str)
        if (!Array.isArray(parsed))
          return []

        return parsed.reduce<z.infer<typeof filterSchema>>((validFilters, item) => {
          const result = filterSchema.element.safeParse(item)
          if (result.success) {
            validFilters.push(result.data)
          }
          return validFilters
        }, [])
      }
      catch {
        return []
      }
    })
    .optional(),
  sort: z.string()
    .transform((str) => {
      try {
        const parsed = JSON.parse(str)
        if (!Array.isArray(parsed))
          return []

        return parsed.reduce<z.infer<typeof sortSchema>>((validSorts, item) => {
          const result = sortSchema.element.safeParse(item)
          if (result.success) {
            validSorts.push(result.data)
          }
          return validSorts
        }, [])
      }
      catch {
        return []
      }
    })
    .optional()
})

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const db = await useDB(event)

  const projectColumns = getTableColumns(project)

  // Create a query that joins project and company tables
  const listQuery = db.select({
    ...projectColumns,
    start: project.startDate,
    end: project.endDate,
    company: {
      id: company.id,
      name: company.name
    }
  })
    .from(project)
    .leftJoin(company, sql`${project.companyId} = ${company.id}`)
    .$dynamic()

  const totalQuery = db.select({
    count: sql<number>`cast(count(*) as int)`
  })
    .from(project)
    .$dynamic()

  if (query) {
    // Handle filters
    if (query.filter) {
      const filters = processFilters(query.filter, projectColumns)
      if (filters.length) {
        withFilters(listQuery, filters)
        withFilters(totalQuery, filters)
      }
    }
    // Handle sorting
    if (query.sort?.length) {
      const sorts: SQL[] = []
      for (const [field, direction] of query.sort) {
        if (field in projectColumns) {
          const columnKey = field as keyof typeof projectColumns
          const orderFunc = direction === 'desc' ? desc : asc
          sorts.push(orderFunc(projectColumns[columnKey]))
        }
      }
      withSorts(listQuery, sorts)
    } else {
      // Fallback sort to id desc
      const sorts: SQL[] = [desc(project.id)]
      withSorts(listQuery, sorts)
    }
  }

  // Handle pagination
  const page = query?.page || 1
  const limit = query?.limit || 20
  withPagination(listQuery, page, limit)
  const count = await totalQuery
  const result = await listQuery

  return {
    data: result,
    total: count[0]?.count || 0,
    page,
    limit
  }
})
