/** Column definition — compatible with the existing DataTable component */
export interface AppColumn<Row = Record<string, unknown>> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  class?: string
  /** Optional render override for the cell value */
  render?: (value: unknown, row: Row) => string
}

export type SortDirection = 'asc' | 'desc' | null

export interface TableSort {
  key: string
  direction: SortDirection
}
