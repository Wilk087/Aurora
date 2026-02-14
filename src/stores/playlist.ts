import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLibraryStore } from './library'

export type PlaylistSortOrder = 'updated' | 'created' | 'name' | 'tracks'

export const usePlaylistStore = defineStore('playlist', () => {
  const playlists = ref<Playlist[]>([])
  const loaded = ref(false)
  const playlistSortOrder = ref<PlaylistSortOrder>('updated')

  async function loadPlaylists() {
    playlists.value = await window.api.getPlaylists()
    loaded.value = true
  }

  async function createPlaylist(name: string): Promise<Playlist> {
    const pl = await window.api.createPlaylist(name)
    playlists.value = [...playlists.value, pl]
    return pl
  }

  async function deletePlaylist(id: string) {
    await window.api.deletePlaylist(id)
    playlists.value = playlists.value.filter(p => p.id !== id)
  }

  async function renamePlaylist(id: string, name: string) {
    const updated = await window.api.renamePlaylist(id, name)
    if (updated) {
      const idx = playlists.value.findIndex(p => p.id === id)
      if (idx >= 0) {
        playlists.value = [
          ...playlists.value.slice(0, idx),
          updated,
          ...playlists.value.slice(idx + 1),
        ]
      }
    }
  }

  async function addTracks(playlistId: string, trackIds: string[]) {
    const library = useLibraryStore()
    // Build metadata snapshot for the tracks being added
    const trackMeta: Record<string, TrackMetaSnapshot> = {}
    const trackMap = new Map(library.tracks.map(t => [t.id, t]))
    for (const tid of trackIds) {
      const track = trackMap.get(tid)
      if (track) {
        trackMeta[tid] = { title: track.title, artist: track.artist, album: track.album }
      }
    }
    const updated = await window.api.addTracksToPlaylist(playlistId, trackIds, trackMeta)
    if (updated) {
      const idx = playlists.value.findIndex(p => p.id === playlistId)
      if (idx >= 0) {
        playlists.value = [
          ...playlists.value.slice(0, idx),
          updated,
          ...playlists.value.slice(idx + 1),
        ]
      }
    }
  }

  async function removeTrack(playlistId: string, trackId: string) {
    const updated = await window.api.removeTrackFromPlaylist(playlistId, trackId)
    if (updated) {
      const idx = playlists.value.findIndex(p => p.id === playlistId)
      if (idx >= 0) {
        playlists.value = [
          ...playlists.value.slice(0, idx),
          updated,
          ...playlists.value.slice(idx + 1),
        ]
      }
    }
  }

  function getPlaylistById(id: string) {
    return playlists.value.find(p => p.id === id) || null
  }

  /** Resolve a playlist's trackIds to full Track objects from library */
  function getPlaylistTracks(id: string): Track[] {
    const library = useLibraryStore()
    const pl = getPlaylistById(id)
    if (!pl) return []
    const trackMap = new Map(library.tracks.map(t => [t.id, t]))
    // Build metadata index for fallback lookups (title+artist+album → Track)
    const byMeta = new Map<string, Track>()
    for (const t of library.tracks) {
      const key = `${t.title}\0${t.artist}\0${t.album}`.toLowerCase()
      if (!byMeta.has(key)) byMeta.set(key, t)
    }
    return pl.trackIds
      .map(tid => {
        // 1. Direct ID lookup
        const direct = trackMap.get(tid)
        if (direct) return direct
        // 2. Metadata fallback: use stored snapshot to find a cross-source match
        const meta = pl.trackMeta?.[tid]
        if (meta) {
          const key = `${meta.title}\0${meta.artist}\0${meta.album}`.toLowerCase()
          return byMeta.get(key)
        }
        return undefined
      })
      .filter((t): t is Track => !!t)
  }

  const sortedPlaylists = computed(() => {
    const list = [...playlists.value]
    switch (playlistSortOrder.value) {
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name))
      case 'created':
        return list.sort((a, b) => b.createdAt - a.createdAt)
      case 'tracks':
        return list.sort((a, b) => b.trackIds.length - a.trackIds.length)
      case 'updated':
      default:
        return list.sort((a, b) => b.updatedAt - a.updatedAt)
    }
  })

  return {
    playlists,
    loaded,
    sortedPlaylists,
    playlistSortOrder,
    loadPlaylists,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addTracks,
    removeTrack,
    getPlaylistById,
    getPlaylistTracks,
  }
})
