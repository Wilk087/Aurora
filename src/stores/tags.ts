import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLibraryStore } from './library'

export const useTagsStore = defineStore('tags', () => {
  const trackTags = ref<Map<string, string[]>>(new Map())
  const albumTags = ref<Map<string, string[]>>(new Map())
  const loaded = ref(false)

  async function load() {
    const data = await window.api.getTags()
    trackTags.value = new Map(Object.entries(data.trackTags || {}))
    albumTags.value = new Map(Object.entries(data.albumTags || {}))
    loaded.value = true
  }

  function sync(data: { trackTags: Record<string, string[]>; albumTags: Record<string, string[]> }) {
    trackTags.value = new Map(Object.entries(data.trackTags || {}))
    albumTags.value = new Map(Object.entries(data.albumTags || {}))
  }

  function getTrackTags(trackId: string): string[] {
    return trackTags.value.get(trackId) ?? []
  }

  function getAlbumTags(albumKey: string): string[] {
    return albumTags.value.get(albumKey) ?? []
  }

  /** Returns the album key used to look up tags: "albumName---albumArtist" */
  function albumKey(albumName: string, albumArtist: string): string {
    return `${albumName}---${albumArtist}`
  }

  /** All unique tags across tracks and albums, sorted */
  const allTags = computed<string[]>(() => {
    const set = new Set<string>()
    for (const tags of trackTags.value.values()) {
      for (const t of tags) set.add(t)
    }
    for (const tags of albumTags.value.values()) {
      for (const t of tags) set.add(t)
    }
    return Array.from(set).sort()
  })

  /** Suggested tags for a set of track IDs — genre metadata + existing library tags */
  function suggestedTrackTags(trackIds: string[]): string[] {
    const library = useLibraryStore()
    const suggestions = new Set<string>()

    for (const id of trackIds) {
      const track = library.tracks.find(t => t.id === id)
      if (track?.genre) {
        for (const g of track.genre.split(/[,/;]+/).map(s => s.trim().toLowerCase()).filter(Boolean)) {
          suggestions.add(g)
        }
      }
    }

    // Add tags already used elsewhere in the library (for discoverability)
    for (const t of allTags.value) suggestions.add(t)

    // Remove tags already applied to all selected tracks
    const commonTags = trackIds.length > 0
      ? trackIds.reduce<Set<string>>((acc, id, i) => {
          const tags = new Set(getTrackTags(id))
          if (i === 0) return tags
          for (const t of acc) { if (!tags.has(t)) acc.delete(t) }
          return acc
        }, new Set())
      : new Set<string>()

    for (const t of commonTags) suggestions.delete(t)

    return Array.from(suggestions).sort()
  }

  /** Suggested tags for a set of album keys — genre metadata + existing library tags */
  function suggestedAlbumTags(albumKeys: string[]): string[] {
    const library = useLibraryStore()
    const suggestions = new Set<string>()

    for (const key of albumKeys) {
      const album = library.albums.find(a => `${a.name}---${a.artist}` === key)
      if (album) {
        for (const track of album.tracks) {
          if (track.genre) {
            for (const g of track.genre.split(/[,/;]+/).map(s => s.trim().toLowerCase()).filter(Boolean)) {
              suggestions.add(g)
            }
          }
        }
      }
    }

    for (const t of allTags.value) suggestions.add(t)

    const commonTags = albumKeys.length > 0
      ? albumKeys.reduce<Set<string>>((acc, key, i) => {
          const tags = new Set(getAlbumTags(key))
          if (i === 0) return tags
          for (const t of acc) { if (!tags.has(t)) acc.delete(t) }
          return acc
        }, new Set())
      : new Set<string>()

    for (const t of commonTags) suggestions.delete(t)

    return Array.from(suggestions).sort()
  }

  async function setTrackTags(ids: string[], tags: string[]) {
    const data = await window.api.setTrackTags(ids, tags)
    sync(data)
  }

  async function setAlbumTags(albumKeys: string[], tags: string[]) {
    const data = await window.api.setAlbumTags(albumKeys, tags)
    sync(data)
  }

  async function addTrackTags(ids: string[], tagsToAdd: string[]) {
    const data = await window.api.addTrackTags(ids, tagsToAdd)
    sync(data)
  }

  async function addAlbumTags(albumKeys: string[], tagsToAdd: string[]) {
    const data = await window.api.addAlbumTags(albumKeys, tagsToAdd)
    sync(data)
  }

  async function removeTrackTags(ids: string[], tagsToRemove: string[]) {
    const data = await window.api.removeTrackTags(ids, tagsToRemove)
    sync(data)
  }

  async function removeAlbumTags(albumKeys: string[], tagsToRemove: string[]) {
    const data = await window.api.removeAlbumTags(albumKeys, tagsToRemove)
    sync(data)
  }

  function normalizeTagList(input: string[]): string[] {
    return Array.from(new Set(input.map(t => t.toLowerCase().trim()).filter(Boolean)))
  }

  /**
   * Auto-tag albums from metadata and fetched artist info.
   * Strategy: use album/track genre tags first; if none exist, fall back to fetched artist tags.
   * Existing album tags are preserved.
   */
  async function autoTagAlbumsFromFetchedData(): Promise<{ tagged: number; skipped: number }> {
    const library = useLibraryStore()
    const artistTagCache = new Map<string, string[]>()
    let tagged = 0
    let skipped = 0

    for (const album of library.albums) {
      const key = `${album.name}---${album.artist}`
      if (getAlbumTags(key).length > 0) {
        skipped++
        continue
      }

      const genreTags = normalizeTagList(
        album.tracks.flatMap(track =>
          (track.genre || '')
            .split(/[,/;]+/)
            .map(v => v.trim())
            .filter(Boolean),
        ),
      )

      let tagsToApply = genreTags
      if (tagsToApply.length === 0) {
        const artistName = album.artist
        if (!artistTagCache.has(artistName)) {
          try {
            const info = await window.api.getArtistInfo(artistName)
            artistTagCache.set(artistName, normalizeTagList(info?.tags ?? []))
          } catch {
            artistTagCache.set(artistName, [])
          }
        }
        tagsToApply = artistTagCache.get(artistName) ?? []
      }

      if (tagsToApply.length === 0) {
        skipped++
        continue
      }

      await setAlbumTags([key], tagsToApply)
      tagged++
    }

    return { tagged, skipped }
  }

  return {
    trackTags,
    albumTags,
    allTags,
    loaded,
    load,
    getTrackTags,
    getAlbumTags,
    albumKey,
    suggestedTrackTags,
    suggestedAlbumTags,
    setTrackTags,
    setAlbumTags,
    addTrackTags,
    addAlbumTags,
    removeTrackTags,
    removeAlbumTags,
    autoTagAlbumsFromFetchedData,
  }
})

export const COMMON_TAGS = [
  'soundtrack',
  'game ost',
  'anime ost',
  'film score',
  'tv show',
  'video game',
  'instrumental',
  'classical',
  'compilation',
  'live',
  'remix',
  'acoustic',
  'covers',
]
