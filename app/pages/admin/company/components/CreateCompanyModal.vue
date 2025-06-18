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

const pending = ref(false)

async function onSubmit({ data }: FormSubmitEvent<Schema>) {
  if (pending.value)
    return
  pending.value = true
  try {
    const res = await $fetch<{ company: any }>('/api/admin/company/create', {
      method: 'POST',
      body: {
        name: data.name,
        type: data.type,
        isActive: data.isActive,
        externalReference: data.externalReference || undefined
      }
    })
    if (res?.company) {
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
