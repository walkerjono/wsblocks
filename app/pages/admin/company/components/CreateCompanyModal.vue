<script setup lang="ts">
const { t } = defineProps<{
  t: TranFunction
}>()

const emit = defineEmits<{
  created: []
  cancel: []
}>()

const open = defineModel('open', { default: false })

const schema = z.object({
  name: z.string().min(4, t('company.validation.nameMin', { n: 4 })),
  type: z.enum(['customer']),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean(),
  externalReference: z.string().optional()
})
type Schema = zodOutput<typeof schema>

const state = reactive({
  name: '',
  type: 'customer' as const,
  tags: [] as string[],
  isActive: true,
  externalReference: ''
})

const pending = ref(false)

async function onSubmit({ data }: FormSubmitEvent<Schema>) {
  if (pending.value)
    return
  pending.value = true

  try {
    // Ensure we have a CSRF token before proceeding
    const { globalCsrf } = await import('../../../../composables/useCsrf')

    // If no CSRF token, fetch one first
    if (!globalCsrf.csrfToken.value) {
      console.log('No CSRF token found, fetching one...')
      await $fetch('/api/admin/csrf', {
        method: 'GET',
        credentials: 'include'
      })
    }

    console.log('Using CSRF token:', globalCsrf.csrfToken.value)

    // Refresh the CSRF token before making the request
    console.log('Refreshing CSRF token...')
    const csrfResponse = await $fetch('/api/admin/csrf', {
      method: 'GET',
      credentials: 'include'
    })
    console.log('CSRF response:', csrfResponse)

    // Get the latest token
    const latestToken = globalCsrf.csrfToken.value
    console.log('Latest CSRF token:', latestToken)

    // Use $fetch directly for client-side fetching with explicit CSRF header
    const nuxtApp = useNuxtApp()
    const res = await nuxtApp.$customFetch<{ company: any }>('/api/admin/company/create', {
      method: 'POST',
      body: {
        name: data.name,
        type: data.type,
        tags: data.tags && data.tags.length > 0 ? data.tags.join(',') : undefined,
        isActive: data.isActive,
        externalReference: data.externalReference || undefined
      },
      // Add CSRF token explicitly to headers with lowercase name for consistency
      headers: {
        'x-csrf-token': latestToken || ''
      },
      // Include credentials to ensure cookies are sent
      credentials: 'include'
    })

    if (res.company) {
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
    :title="t('company.actions.createCompany')"
  >
    <template #body>
      <UForm
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
