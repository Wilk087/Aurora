import { ref, computed } from 'vue'
import { useTagsStore } from '@/stores/tags'

export function useTagFilter() {
  const tagsStore = useTagsStore()
  const tagSearch = ref('')
  const activeTags = ref<string[]>([])

  const filteredTagOptions = computed(() => {
    const q = tagSearch.value.toLowerCase().trim()
    const source = tagsStore.visibleTags
    if (!q) return source
    return source.filter(tag => tag.includes(q))
  })

  function toggleTag(tag: string) {
    if (activeTags.value.includes(tag)) {
      activeTags.value = activeTags.value.filter(t => t !== tag)
    } else {
      activeTags.value = [...activeTags.value, tag]
    }
  }

  return { tagSearch, activeTags, filteredTagOptions, toggleTag }
}
