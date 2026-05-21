import { ref, readonly } from 'vue'

/**
 * Manages boolean open/close state for modals and drawers.
 * Framework-agnostic — works with AppModal, AppDrawer, or any v-model:boolean overlay.
 */
export function useModal(initialOpen = false) {
  const isOpen = ref(initialOpen)

  function open():   void { isOpen.value = true }
  function close():  void { isOpen.value = false }
  function toggle(): void { isOpen.value = !isOpen.value }

  return { isOpen: readonly(isOpen), open, close, toggle }
}
