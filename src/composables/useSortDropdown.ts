import { ref, onMounted, onUnmounted } from 'vue'

export function useSortDropdown() {
  const showSortMenu = ref(false)
  const sortMenuStyle = ref<Record<string, string>>({})
  let _triggerEl: HTMLElement | null = null

  function toggleSortMenu(el: HTMLElement) {
    if (!showSortMenu.value) {
      const rect = el.getBoundingClientRect()
      sortMenuStyle.value = {
        top: `${rect.bottom + 4}px`,
        left: `${Math.min(rect.left, window.innerWidth - 336)}px`,
      }
      _triggerEl = el
    }
    showSortMenu.value = !showSortMenu.value
  }

  function closeSortMenu() {
    showSortMenu.value = false
  }

  function onClickOutside(e: MouseEvent) {
    if (_triggerEl && !_triggerEl.contains(e.target as Node)) {
      showSortMenu.value = false
    }
  }

  onMounted(() => document.addEventListener('click', onClickOutside))
  onUnmounted(() => document.removeEventListener('click', onClickOutside))

  return { showSortMenu, sortMenuStyle, toggleSortMenu, closeSortMenu }
}
