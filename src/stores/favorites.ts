import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLibraryStore } from './library'

export const useFavoritesStore = defineStore('favorites', () => {
  const ids = ref<Set<string>>(new Set())
  const meta = ref<Map<string, TrackMetaSnapshot>>(new Map())
  const loaded = ref(false)

  async function load() {
    const data = await window.api.getFavorites()
    ids.value = new Set(data.ids)
    meta.value = new Map(Object.entries(data.meta || {}))
    loaded.value = true
  }

  async function toggle(trackId: string) {
    const library = useLibraryStore()
    const track = library.tracks.find(t => t.id === trackId)
    const trackMeta: TrackMetaSnapshot | undefined = track
      ? { title: track.title, artist: track.artist, album: track.album }
      : undefined
    const data = await window.api.toggleFavorite(trackId, trackMeta)
    ids.value = new Set(data.ids)
    meta.value = new Map(Object.entries(data.meta || {}))
  }

  /**
   * Resolved favorite IDs: includes both direct IDs and cross-source matches
   * found via stored metadata snapshots. This allows isFavorite() to return true
   * for a subsonic track when the local version was favorited (and vice versa).
   */
  const resolvedIds = computed(() => {
    const library = useLibraryStore()
    const resolved = new Set(ids.value)
    const trackMap = new Map(library.tracks.map(t => [t.id, t]))
    // Build metadata → track lookup for all library tracks
    const byMeta = new Map<string, Track>()
    for (const t of library.tracks) {
      const key = `${t.title}\0${t.artist}\0${t.album}`.toLowerCase()
      if (!byMeta.has(key)) byMeta.set(key, t)
    }
    // For every favorite ID not directly in the library, try metadata match
    for (const id of ids.value) {
      if (!trackMap.has(id)) {
        const m = meta.value.get(id)
        if (m) {
          const key = `${m.title}\0${m.artist}\0${m.album}`.toLowerCase()
          const match = byMeta.get(key)
          if (match) resolved.add(match.id)
        }
      }
    }
    return resolved
  })

  function isFavorite(trackId: string): boolean {
    return resolvedIds.value.has(trackId)
  }

  const favoriteTracks = computed(() => {
    const library = useLibraryStore()
    const trackMap = new Map(library.tracks.map(t => [t.id, t]))
    // Build metadata index for fallback lookups
    const byMeta = new Map<string, Track>()
    for (const t of library.tracks) {
      const key = `${t.title}\0${t.artist}\0${t.album}`.toLowerCase()
      if (!byMeta.has(key)) byMeta.set(key, t)
    }
    const seen = new Set<string>()
    return [...ids.value]
      .map(id => {
        // 1. Direct ID lookup
        const direct = trackMap.get(id)
        if (direct) return direct
        // 2. Metadata fallback
        const m = meta.value.get(id)
        if (m) {
          const key = `${m.title}\0${m.artist}\0${m.album}`.toLowerCase()
          return byMeta.get(key)
        }
        return undefined
      })
      .filter((t): t is Track => {
        if (!t) return false
        // Deduplicate in case both the original and cross-source match resolve
        if (seen.has(t.id)) return false
        seen.add(t.id)
        return true
      })
  })

  const count = computed(() => ids.value.size)

  return { ids, meta, loaded, load, toggle, isFavorite, favoriteTracks, count }
})
