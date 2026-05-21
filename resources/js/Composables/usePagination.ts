import { ref, computed, readonly } from 'vue'
import type { AppPaginationMeta } from '@/types'

/**
 * Client-side pagination logic.
 * Pass `meta` from the server (or a computed ref of your local data length)
 * and call goTo/next/prev to update the page.
 */
export function usePagination(meta: AppPaginationMeta) {
  const currentPage = ref(meta.currentPage)

  const isFirstPage = computed(() => currentPage.value <= 1)
  const isLastPage  = computed(() => currentPage.value >= meta.lastPage)

  /** Windowed page numbers with ellipsis support (matches AppPagination logic) */
  const pageRange = computed<(number | '…')[]>(() => {
    const last = meta.lastPage
    const cur  = currentPage.value
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)

    const result: (number | '…')[] = [1]
    if (cur > 3) result.push('…')
    for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++) result.push(i)
    if (cur < last - 2) result.push('…')
    result.push(last)
    return result
  })

  function goTo(page: number): void {
    if (page < 1 || page > meta.lastPage) return
    currentPage.value = page
  }

  function next():  void { goTo(currentPage.value + 1) }
  function prev():  void { goTo(currentPage.value - 1) }
  function first(): void { goTo(1) }
  function last():  void { goTo(meta.lastPage) }

  return {
    currentPage: readonly(currentPage),
    isFirstPage,
    isLastPage,
    pageRange,
    goTo,
    next,
    prev,
    first,
    last,
  }
}
