<i18n src="./i18n.json"></i18n>

<script setup lang="ts">
import CreateProjectModal from './components/CreateProjectModal.vue'

interface Project {
  id: string
  name: string
  company: {
    id: string
    name: string
  }
  start: string
  end: string
  tags?: string
  isActive: boolean
  externalReference?: string
  createdAt: string
}

const { t } = useI18n()
const isProjectModalOpen = ref(false)
const defaultSelectedColumns = ref(['name', 'company', 'start', 'end', 'tags', 'isActive', 'actions'])

const filters: AdminTableFilter[] = reactive([
  {
    name: t('project.columns.name'),
    field: 'name',
    type: 'input',
    value: undefined
  },
  {
    name: t('project.columns.company'),
    field: 'companyId',
    type: 'checkbox',
    items: [],
    value: []
  },
  {
    name: t('global.page.tags'),
    field: 'tags',
    type: 'checkbox',
    items: [],
    value: []
  },
  {
    name: t('global.page.status'),
    field: 'isActive',
    type: 'tabs',
    items: [
      { label: t('global.page.all'), id: '' },
      { label: t('project.status.active'), id: 'true' },
      { label: t('project.status.inactive'), id: 'false' }
    ],
    value: ''
  },
  {
    name: t('global.page.createdAt'),
    field: 'createdAt',
    type: 'daterange',
    value: { start: undefined, end: undefined }
  }
])

const { refresh: _refresh } = useAdminTable()

const getActionItems = (row: Row<Project>) => {
  const project = row.original
  return [
    {
      type: 'label',
      label: t('global.page.actions')
    },
    {
      type: 'separator'
    },
    {
      label: t('global.page.edit'),
      icon: 'i-lucide-edit',
      color: 'primary',
      async onSelect() {
        // TODO: Edit project functionality would go here
        console.log('Edit project', project.id)
      }
    },
    {
      label: t('global.page.delete'),
      icon: 'i-lucide-trash',
      color: 'error',
      async onSelect() {
        // TODO: Delete project functionality would go here
        console.log('Delete project', project.id)
      }
    }
  ]
}

const columns: AdminTableColumn<Project>[] = [
  {
    accessorKey: 'id',
    header: 'ID'
  },
  {
    accessorKey: 'name',
    header: t('project.columns.name')
  },
  {
    accessorKey: 'company.name',
    id: 'company',
    header: t('project.columns.company')
  },
  {
    accessorKey: 'start',
    header: t('project.columns.start'),
    cell: (cell) => {
      const value = cell.getValue() as string | null
      return value ? formatToDay(value) : ''
    }
  },
  {
    accessorKey: 'end',
    header: t('project.columns.end'),
    cell: (cell) => {
      const value = cell.getValue() as string | null
      return value ? formatToDay(value) : ''
    }
  },
  {
    accessorKey: 'tags',
    header: t('global.page.tags')
  },
  {
    accessorKey: 'isActive',
    header: t('global.page.status')
  },
  {
    accessorKey: 'externalReference',
    header: t('project.columns.externalReference')
  },
  {
    accessorKey: 'createdAt',
    header: t('global.page.createdAt'),
    cell: (cell) => {
      const value = cell.getValue() as string | null
      return value ? formatToDatetime(value) : ''
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => actionColumn(row, getActionItems)
  }
]

const fetchCompanyCount = async (filter: FilterCondition[]) => {
  const companyCount = await $fetch<ColumnCount[]>('/api/admin/count/project/companyId', {
    query: {
      filter: JSON.stringify(filter)
    }
  })

  // Fetch company names for the IDs
  const companyIds = companyCount.map(item => item.column).filter(Boolean)
  let companyNames: Record<string, string> = {}

  if (companyIds.length > 0) {
    const response = await $fetch<{ data: Array<{ id: string, name: string }> }>('/api/admin/list/company', {
      query: {
        filter: JSON.stringify([
          { field: 'id', operator: 'in', value: companyIds }
        ])
      }
    })

    companyNames = response.data.reduce((acc: Record<string, string>, company: { id: string, name: string }) => {
      acc[company.id] = company.name
      return acc
    }, {})
  }

  const companyFilter = filters[1] as FilterCheckbox
  companyFilter.items = companyCount.map(company => ({
    label: company.column ? (companyNames[company.column] || 'Unknown') : 'Unknown',
    id: company.column || '',
    count: company.count
  }))

  // Sort company filter items alphabetically by label
  companyFilter.items.sort((a, b) => a.label.localeCompare(b.label))
}

const fetchTagsCount = async (filter: FilterCondition[]) => {
  const tagsCount = await $fetch<ColumnCount[]>('/api/admin/count/project/tags', {
    query: {
      filter: JSON.stringify(filter)
    }
  })
  const tagsFilter = filters[2] as FilterCheckbox
  tagsFilter.items = tagsCount.map(tag => ({
    label: tag.column || 'Untagged',
    id: tag.column || '',
    count: tag.count
  }))

  // Sort tags filter items alphabetically by label
  tagsFilter.items.sort((a, b) => a.label.localeCompare(b.label))
}

const fetchStatusCount = async (filter: FilterCondition[]) => {
  const statusCount = await $fetch<ColumnCount[]>('/api/admin/count/project/isActive', {
    query: {
      filter: JSON.stringify(filter)
    }
  })
  const statusFilter = filters[3] as FilterTabs
  statusFilter.items.forEach((item) => {
    if (item.id === '')
      return
    const status = statusCount.find(status => status.column === item.id)
    item.count = status ? status.count : 0
  })
}

const fetchData: FetchDataFn<Project> = async ({ page, limit, sort, filter }) => {
  await Promise.allSettled([fetchCompanyCount(filter), fetchTagsCount(filter), fetchStatusCount(filter)])
  const result = await $fetch<PageData<Project>>('/api/admin/project/list', {
    query: {
      page,
      limit,
      sort: JSON.stringify(sort.map((item) => {
        return [item.field, item.order]
      })),
      filter: JSON.stringify(filter)
    }
  })
  return {
    data: result.data,
    total: result.total
  }
}
</script>

<template>
  <NuxtLayout name="admin">
    <template #navRight>
      <UButton
        color="neutral"
        icon="i-lucide-plus"
        variant="outline"
        @click="isProjectModalOpen = true"
      >
        {{ t('project.actions.createProject') }}
      </UButton>
    </template>
    <AdminTable
      ref="table"
      v-model:selected-columns="defaultSelectedColumns"
      :columns="columns"
      :filters="filters"
      :fetch-data="fetchData"
    >
      <template #isActive-cell="{ row: { original } }">
        <UBadge
          :color="original.isActive ? 'success' : 'error'"
          :label="original.isActive ? t('project.status.active') : t('project.status.inactive')"
        />
      </template>
    </AdminTable>
    <CreateProjectModal
      v-model:open="isProjectModalOpen"
      :t="t"
      @created="_refresh"
    />
  </NuxtLayout>
</template>
