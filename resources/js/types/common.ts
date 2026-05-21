// ── Primitive scales ──────────────────────────────────────────────────────────

export type AppSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** Button / general-purpose variant */
export type AppVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'success'
  | 'warning'

/** Badge color (includes neutral 'default') */
export type AppColor = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

/** Alert / Toast type */
export type AppAlertType = 'info' | 'success' | 'warning' | 'error'

// ── Async state ───────────────────────────────────────────────────────────────

export type AppStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T = unknown> {
  data: T | null
  status: AppStatus
  error: string | null
}

// ── Select / Dropdown ─────────────────────────────────────────────────────────

export interface AppSelectOption {
  value?: string | number
  label?: string
  disabled?: boolean
  icon?: unknown
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

export interface AppTab {
  value: string
  label: string
  icon?: unknown
  badge?: string | number
  disabled?: boolean
}

// ── Avatar ────────────────────────────────────────────────────────────────────

export interface AppAvatarUser {
  name?: string
  avatar?: string
  color?: string
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface AppPaginationMeta {
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}
