import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLibraryStore } from './library'

export const usePlaylistStore = defineStore('playlist', () => {
  const playlists = ref<Playlist[]>([])
  const loaded = ref(false)

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
    const updated = await window.api.addTracksToPlaylist(playlistId, trackIds)
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
    return pl.trackIds
      .map(tid => trackMap.get(tid))
      .filter((t): t is Track => !!t)
  }

  const sortedPlaylists = computed(() =>
    [...playlists.value].sort((a, b) => b.updatedAt - a.updatedAt)
  )

  return {
    playlists,
    loaded,
    sortedPlaylists,
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
