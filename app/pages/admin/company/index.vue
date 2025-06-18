<i18n src="./i18n.json"></i18n>

<script setup lang="ts">
import CreateCompanyModal from './components/CreateCompanyModal.vue'
import EditCompanyModal from './components/EditCompanyModal.vue'

interface Company {
  id: string
  name: string
  type: string
  tags?: string
  isActive: boolean
  externalReference?: string
  createdAt: string
}

const { t } = useI18n()
const isCompanyModalOpen = ref(false)
const isEditCompanyModalOpen = ref(false)
const selectedCompanyId = ref('')
const defaultSelectedColumns = ref(['name', 'type', 'tags', 'isActive', 'actions'])

const filters: AdminTableFilter[] = reactive([
  {
    name: t('company.columns.name'),
    field: 'name',
    type: 'input',
    value: undefined
  },
  {
    name: t('company.columns.type'),
    field: 'type',
    type: 'checkbox',
    items: [
      { label: t('company.types.customer'), id: 'customer', count: 0 }
    ],
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
      { label: t('company.status.active'), id: 'true' },
      { label: t('company.status.inactive'), id: 'false' }
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

const { refresh } = useAdminTable()

const getActionItems = (row: Row<Company>) => {
  const company = row.original
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
        selectedCompanyId.value = company.id
        isEditCompanyModalOpen.value = true
      }
    },
    {
      label: t('global.page.delete'),
      icon: 'i-lucide-trash',
      color: 'error',
      async onSelect() {
        // TODO: Delete company functionality would go here
        console.log('Delete company', company.id)
      }
    }
  ]
}

const columns: AdminTableColumn<Company>[] = [
  {
    accessorKey: 'id',
    header: 'ID'
  },
  {
    accessorKey: 'name',
    header: t('company.columns.name')
  },
  {
    accessorKey: 'type',
    header: t('company.columns.type')
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
    header: t('company.columns.externalReference')
  },
  {
    accessorKey: 'createdAt',
    header: t('global.page.createdAt'),
    cell: dateColumn
  },
  {
    id: 'actions',
    cell: ({ row }) => actionColumn(row, getActionItems)
  }
]

const fetchTypeCount = async (filter: FilterCondition[]) => {
  const typeCount = await $fetch<ColumnCount[]>('/api/admin/count/company/type', {
    query: {
      filter: JSON.stringify(filter)
    }
  })
  const typeFilter = filters[1] as FilterCheckbox
  typeFilter.items.forEach((item) => {
    const type = typeCount.find(type => type.column === item.id)
    item.count = type ? type.count : 0
  })
}

const fetchTagsCount = async (filter: FilterCondition[]) => {
  const tagsCount = await $fetch<ColumnCount[]>('/api/admin/count/company/tags', {
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
}

const fetchStatusCount = async (filter: FilterCondition[]) => {
  const statusCount = await $fetch<ColumnCount[]>('/api/admin/count/company/isActive', {
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

const fetchData: FetchDataFn<Company> = async ({ page, limit, sort, filter }) => {
  await Promise.allSettled([fetchTypeCount(filter), fetchTagsCount(filter), fetchStatusCount(filter)])
  const result = await $fetch<PageData<Company>>('/api/admin/list/company', {
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
        @click="isCompanyModalOpen = true"
      >
        {{ t('company.actions.createCompany') }}
      </UButton>
    </template>
    <AdminTable
      ref="table"
      v-model:selected-columns="defaultSelectedColumns"
      :columns="columns"
      :filters="filters"
      :fetch-data="fetchData"
    >
      <template #type-cell="{ row: { original } }">
        <UBadge
          color="primary"
          :label="t(`company.types.${original.type}`)"
        />
      </template>
      <template #isActive-cell="{ row: { original } }">
        <UBadge
          :color="original.isActive ? 'success' : 'error'"
          :label="original.isActive ? t('company.status.active') : t('company.status.inactive')"
        />
      </template>
    </AdminTable>
    <CreateCompanyModal
      v-model:open="isCompanyModalOpen"
      :t="t"
      @created="refresh"
    />
    <EditCompanyModal
      v-model:open="isEditCompanyModalOpen"
      :company-id="selectedCompanyId"
      :t="t"
      @updated="refresh"
    />
  </NuxtLayout>
</template>
