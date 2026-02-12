import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLibraryStore } from './library'

export const useFavoritesStore = defineStore('favorites', () => {
  const ids = ref<Set<string>>(new Set())
  const loaded = ref(false)

  async function load() {
    const data = await window.api.getFavorites()
    ids.value = new Set(data)
    loaded.value = true
  }

  async function toggle(trackId: string) {
    const updated = await window.api.toggleFavorite(trackId)
    ids.value = new Set(updated)
  }

  function isFavorite(trackId: string): boolean {
    return ids.value.has(trackId)
  }

  const favoriteTracks = computed(() => {
    const library = useLibraryStore()
    const trackMap = new Map(library.tracks.map(t => [t.id, t]))
    return [...ids.value]
      .map(id => trackMap.get(id))
      .filter((t): t is Track => !!t)
  })

  const count = computed(() => ids.value.size)

  return { ids, loaded, load, toggle, isFavorite, favoriteTracks, count }
})
