<script setup lang="ts">
const props = defineProps<{
  t: TranFunction
  companyId: string
}>()

const emit = defineEmits<{
  updated: []
  cancel: []
}>()

const open = defineModel('open', { default: false })
const { client: _client } = useAuth()
const loading = ref(false)
const company = ref<any>(null)

const schema = z.object({
  name: z.string().min(4, props.t('company.validation.nameMin', { n: 4 })),
  type: z.enum(['customer']),
  isActive: z.boolean(),
  externalReference: z.string().optional()
})
type Schema = zodOutput<typeof schema>

const state = reactive({
  name: '',
  type: 'customer' as const,
  isActive: true,
  externalReference: ''
})

// Fetch company data when modal opens
watch([open, () => props.companyId], async ([isOpen, companyId]) => {
  if (isOpen && companyId) {
    loading.value = true
    try {
      const res = await $fetch<{ company: any }>(`/api/admin/company/${companyId}`, {
        method: 'GET'
      })
      if (res && res.company) {
        company.value = res.company
        // Update the state with the company data
        state.name = res.company.name || ''
        state.type = res.company.type || 'customer'
        state.isActive = res.company.isActive !== undefined ? res.company.isActive : true
        state.externalReference = res.company.externalReference || ''
      }
    } catch (error) {
      console.error('Error fetching company:', error)
      // Show error notification
      useToast().add({
        title: 'Error',
        description: 'Failed to load company data',
        color: 'error'
      })
      // Close the modal
      open.value = false
    } finally {
      loading.value = false
    }
  }
})

async function onSubmit({ data }: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const res = await $fetch<{ company: any }>(`/api/admin/company/${props.companyId}`, {
      method: 'PUT',
      body: {
        name: data.name,
        type: data.type,
        isActive: data.isActive,
        externalReference: data.externalReference || undefined
      }
    })
    if (res && res.company) {
      open.value = false
      emit('updated')
    }
  } catch (error) {
    console.error('Error updating company:', error)
  } finally {
    loading.value = false
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
    :title="t('company.actions.editCompany')"
  >
    <template #body>
      <div
        v-if="loading"
        class="flex justify-center p-4"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin h-8 w-8"
        />
      </div>
      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('company.form.name')"
          name="name"
        >
          <UInput
            v-model="state.name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('company.form.type')"
          name="type"
        >
          <USelect
            v-model="state.type"
            class="w-full"
            :items="[
              { label: t('company.types.customer'), value: 'customer' }
            ]"
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
          >
            {{ t('global.page.save') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
