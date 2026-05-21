import { ref, computed } from 'vue'
import type { AppColumn, SortDirection } from '@/types'

interface UseTableOptions<Row> {
  rowKey?: keyof Row
}

/**
 * Headless table logic: sorting + row selection.
 * Pairs with the DataTable component — or use standalone for custom tables.
 */
export function useTable<Row extends Record<string, unknown>>(
  initialColumns: AppColumn<Row>[],
  options: UseTableOptions<Row> = {},
) {
  const rowKey  = (options.rowKey ?? 'id') as keyof Row
  const columns = ref<AppColumn<Row>[]>(initialColumns) as ReturnType<typeof ref<AppColumn<Row>[]>>

  const sortKey = ref('')
  const sortDir = ref<SortDirection>(null)
  const selectedIds = ref<Set<string | number>>(new Set())

  function toggleSort(key: string): void {
    if (sortKey.value !== key) {
      sortKey.value = key
      sortDir.value = 'asc'
    } else if (sortDir.value === 'asc') {
      sortDir.value = 'desc'
    } else {
      sortKey.value = ''
      sortDir.value = null
    }
  }

  function sortRows(rows: Row[]): Row[] {
    if (!sortKey.value || !sortDir.value) return rows
    return [...rows].sort((a, b) => {
      const av = a[sortKey.value] ?? ''
      const bv = b[sortKey.value] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }

  function toggleRow(id: string | number): void {
    selectedIds.value.has(id) ? selectedIds.value.delete(id) : selectedIds.value.add(id)
  }

  function toggleAll(rows: Row[]): void {
    const allSelected = rows.every(r => selectedIds.value.has(r[rowKey] as string | number))
    rows.forEach(r => {
      const id = r[rowKey] as string | number
      allSelected ? selectedIds.value.delete(id) : selectedIds.value.add(id)
    })
  }

  function clearSelection(): void { selectedIds.value.clear() }

  const selectedCount = computed(() => selectedIds.value.size)

  return {
    columns,
    sortKey,
    sortDir,
    selectedIds,
    selectedCount,
    toggleSort,
    sortRows,
    toggleRow,
    toggleAll,
    clearSelection,
  }
}
