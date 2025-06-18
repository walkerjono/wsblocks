import type { ShallowRef } from 'vue'
import type { UTableInstance } from '../types'

export default function useColumnControl<T>(columns: AdminTableColumn<T>[], tableRef: ShallowRef<UTableInstance | null>) {
  const defaultSelectedColumns = columns
    .map(column => (column.accessorKey || column.id)!)
  const selectedColumns = ref(defaultSelectedColumns)

  watchEffect(() => {
    for (const column of columns) {
      const columnKey = (column.accessorKey || column.id)!
      // For nested properties like 'company.name', use the column id instead of the accessor key
      const tableColumnKey = columnKey.includes('.') ? column.id! : columnKey

      if (selectedColumns.value.includes(columnKey)) {
        tableRef.value?.tableApi?.getColumn(tableColumnKey)?.toggleVisibility(true)
      }
      else {
        tableRef.value?.tableApi?.getColumn(tableColumnKey)?.toggleVisibility(false)
      }
    }
  })
  return {
    selectedColumns
  }
}
