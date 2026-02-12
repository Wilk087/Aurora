import { ref, computed } from 'vue'

/**
 * Composable for multi-select functionality in song lists.
 * Supports click, Ctrl+click, Shift+click range selection.
 */
export function useSelection<T extends { id: string }>(getItems: () => T[]) {
  const selectedIds = ref<Set<string>>(new Set())
  const lastClickedIndex = ref(-1)

  const selectedCount = computed(() => selectedIds.value.size)
  const hasSelection = computed(() => selectedIds.value.size > 0)

  const selectedItems = computed(() => {
    const items = getItems()
    return items.filter(item => selectedIds.value.has(item.id))
  })

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id)
  }

  function handleSelect(index: number, event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) {
    const items = getItems()
    const item = items[index]
    if (!item) return

    const newSet = new Set(selectedIds.value)

    if (event.shiftKey && (event.ctrlKey || event.metaKey) && lastClickedIndex.value >= 0) {
      // Additive range select: add range to existing selection without clearing
      const start = Math.min(lastClickedIndex.value, index)
      const end = Math.max(lastClickedIndex.value, index)
      for (let i = start; i <= end; i++) {
        if (items[i]) newSet.add(items[i].id)
      }
    } else if (event.shiftKey && lastClickedIndex.value >= 0) {
      // Range select: from last clicked to current
      const start = Math.min(lastClickedIndex.value, index)
      const end = Math.max(lastClickedIndex.value, index)
      for (let i = start; i <= end; i++) {
        if (items[i]) newSet.add(items[i].id)
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Toggle single item
      if (newSet.has(item.id)) {
        newSet.delete(item.id)
      } else {
        newSet.add(item.id)
      }
    } else {
      // Single select (replace)
      newSet.clear()
      newSet.add(item.id)
    }

    selectedIds.value = newSet
    lastClickedIndex.value = index
  }

  function selectAll() {
    const items = getItems()
    selectedIds.value = new Set(items.map(i => i.id))
  }

  function clearSelection() {
    selectedIds.value = new Set()
    lastClickedIndex.value = -1
  }

  return {
    selectedIds,
    selectedCount,
    hasSelection,
    selectedItems,
    isSelected,
    handleSelect,
    selectAll,
    clearSelection,
  }
}
