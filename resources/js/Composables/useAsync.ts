import { ref, computed } from 'vue'
import type { AsyncState, AppStatus } from '@/types'

export function useAsync<T = unknown>() {
  const data   = ref<T | null>(null) as ReturnType<typeof ref<T | null>>
  const status = ref<AppStatus>('idle')
  const error  = ref<string | null>(null)

  const isIdle    = computed(() => status.value === 'idle')
  const isLoading = computed(() => status.value === 'loading')
  const isSuccess = computed(() => status.value === 'success')
  const isError   = computed(() => status.value === 'error')

  const state = computed<AsyncState<T>>(() => ({
    data:   data.value,
    status: status.value,
    error:  error.value,
  }))

  async function execute(fn: () => Promise<T>): Promise<T | null> {
    status.value = 'loading'
    error.value  = null

    try {
      data.value   = await fn()
      status.value = 'success'
      return data.value
    } catch (err) {
      status.value = 'error'
      error.value  = err instanceof Error ? err.message : String(err)
      return null
    }
  }

  function reset(): void {
    data.value   = null
    status.value = 'idle'
    error.value  = null
  }

  return { data, status, error, isIdle, isLoading, isSuccess, isError, state, execute, reset }
}
