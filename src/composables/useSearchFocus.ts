import { ref } from 'vue'

// Module-level singleton — shared across all composable calls
const searchInputRef = ref<HTMLInputElement | null>(null)

export function useSearchFocus() {
  function focusSearch() {
    searchInputRef.value?.focus()
    searchInputRef.value?.select()
  }

  return { searchInputRef, focusSearch }
}
