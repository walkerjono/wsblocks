<script setup lang="ts">
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'

const { t } = defineProps<{
  t: TranFunction
}>()

const emit = defineEmits<{
  created: []
  cancel: []
}>()

// TODO: refactor date formatter to use utils/date.ts
const df = new DateFormatter('en-au', {
  dateStyle: 'medium'
})

const now = new Date()
const startDateValue = shallowRef(new CalendarDate(now.getFullYear(), now.getMonth(), now.getDate()))
const endDateValue = shallowRef(new CalendarDate(now.getFullYear(), now.getMonth(), now.getDate()))

const open = defineModel('open', { default: false })

const schema = z.object({
  name: z.string().min(4, t('project.validation.nameMin', { n: 4 })),
  companyId: z.string().min(1, 'Company is required'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean(),
  externalReference: z.string().optional()
})
type Schema = zodOutput<typeof schema>

const state = reactive({
  name: '',
  companyId: '',
  startDate: undefined as Date | undefined,
  endDate: undefined as Date | undefined,
  tags: [] as string[],
  isActive: true,
  externalReference: ''
})

const companies = ref<{ id: string, name: string }[]>([])
const pending = ref(false)
const loadingCompanies = ref(false)

// Fetch companies for dropdown
async function fetchCompanies() {
  loadingCompanies.value = true
  try {
    const result = await $fetch<PageData<{ id: string, name: string }>>('/api/admin/list/company', {
      query: {
        page: 1,
        limit: 100,
        sort: JSON.stringify([['name', 'asc']]),
        filter: JSON.stringify([])
      }
    })
    companies.value = result.data
  } catch (err) {
    console.error('Failed to fetch companies:', err)
    useToast().add({ title: 'Error', description: 'Failed to load companies', color: 'error' })
  } finally {
    loadingCompanies.value = false
  }
}

// Fetch companies when modal opens
watch(() => open.value, (newValue) => {
  if (newValue) {
    fetchCompanies()
  }
})

async function onSubmit({ data }: FormSubmitEvent<Schema>) {
  if (pending.value)
    return
  pending.value = true
  try {
    // Format dates as ISO strings (YYYY-MM-DD)
    const formatDate = (date: Date | undefined) => {
      if (!date)
        return undefined
      return date.toISOString().split('T')[0]
    }

    const res = await $fetch<{ project: any }>('/api/admin/project/create', {
      method: 'POST',
      body: {
        name: data.name,
        companyId: data.companyId,
        startDate: formatDate(state.startDate),
        endDate: formatDate(state.endDate),
        tags: data.tags && data.tags.length > 0 ? data.tags.join(',') : undefined,
        isActive: data.isActive,
        externalReference: data.externalReference || undefined
      }
    })
    if (res?.project) {
      open.value = false
      emit('created')
    }
  } catch (err) {
    console.error(err)
    useToast().add({ title: 'Error', description: t('global.page.saveFailed'), color: 'error' })
  } finally {
    pending.value = false
  }
}

const onCancel = () => {
  open.value = false
  emit('cancel')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :close="true"
    :title="t('project.actions.createProject')"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('project.form.name')"
          name="name"
        >
          <UInput
            v-model="state.name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('project.form.company')"
          name="companyId"
        >
          <USelect
            v-model="state.companyId"
            class="w-full"
            :loading="loadingCompanies"
            :items="companies.map(company => ({ label: company.name, value: company.id }))"
          />
        </UFormField>

        <UFormField
          :label="t('project.columns.start')"
          name="startDate"
        >
          <UPopover>
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-calendar"
            >
              {{ state.startDate ? df.format(state.startDate) : t('project.form.selectDate') }}
            </UButton>

            <template #content>
              <UCalendar
                v-model="startDateValue"
                class="p-2"
                @update:model-value="(val) => { if (val && 'toDate' in val) state.startDate = val.toDate(getLocalTimeZone()) }"
              />
            </template>
          </UPopover>
        </UFormField>

        <UFormField
          :label="t('project.columns.end')"
          name="endDate"
        >
          <UPopover>
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-calendar"
            >
              {{ state.endDate ? df.format(state.endDate) : t('project.form.selectDate') }}
            </UButton>

            <template #content>
              <UCalendar
                v-model="endDateValue"
                class="p-2"
                @update:model-value="(val) => { if (val && 'toDate' in val) state.endDate = val.toDate(getLocalTimeZone()) }"
              />
            </template>
          </UPopover>
        </UFormField>

        <UFormField
          :label="t('global.page.tags')"
          name="tags"
        >
          <UInputTags
            v-model="state.tags"
            class="w-full"
            :placeholder="t('global.page.tags')"
          />
        </UFormField>

        <UFormField
          :label="t('global.page.isActive')"
          name="isActive"
        >
          <UCheckbox v-model="state.isActive" />
        </UFormField>

        <UFormField
          :label="t('global.page.externalReference')"
          name="externalReference"
        >
          <UInput
            v-model="state.externalReference"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end w-full gap-4">
          <UButton
            color="neutral"
            variant="soft"
            @click="onCancel"
          >
            {{ t('global.page.cancel') }}
          </UButton>
          <UButton
            type="submit"
            color="primary"
            :disabled="pending"
          >
            {{ t('global.page.create') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
