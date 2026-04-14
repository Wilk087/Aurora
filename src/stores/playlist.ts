import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLibraryStore } from './library'
import { evaluateSmartPlaylist } from '@/utils/smartPlaylistMatcher'
import { songKey } from '@/utils/smartPlaylistMatcher'
import { useTagsStore } from './tags'

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

  async function createSmartPlaylist(name: string, rules: SmartPlaylistRule[], ruleMatch: 'all' | 'any'): Promise<Playlist> {
    const pl = await window.api.createSmartPlaylist(name, JSON.parse(JSON.stringify(rules)), ruleMatch)
    playlists.value = [...playlists.value, pl]
    return pl
  }

  async function updateSmartPlaylistRules(id: string, rules: SmartPlaylistRule[], ruleMatch: 'all' | 'any') {
    const updated = await window.api.updateSmartPlaylist(id, JSON.parse(JSON.stringify(rules)), ruleMatch)
    if (updated) {
      const idx = playlists.value.findIndex(p => p.id === id)
      if (idx >= 0) {
        playlists.value = [...playlists.value.slice(0, idx), updated, ...playlists.value.slice(idx + 1)]
      }
    }
    return updated
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

  async function setCustomImage(playlistId: string, imagePath: string | null) {
    const updated = await window.api.setPlaylistCustomImage(playlistId, imagePath)
    if (updated) {
      const idx = playlists.value.findIndex(p => p.id === playlistId)
      if (idx >= 0) {
        playlists.value = [...playlists.value.slice(0, idx), updated, ...playlists.value.slice(idx + 1)]
      }
    }
    return updated
  }

  async function reorderTracks(playlistId: string, fromIndex: number, toIndex: number) {
    // Optimistic update
    const idx = playlists.value.findIndex(p => p.id === playlistId)
    if (idx >= 0) {
      const pl = { ...playlists.value[idx], trackIds: [...playlists.value[idx].trackIds] }
      const [removed] = pl.trackIds.splice(fromIndex, 1)
      pl.trackIds.splice(toIndex, 0, removed)
      playlists.value = [...playlists.value.slice(0, idx), pl, ...playlists.value.slice(idx + 1)]
    }
    // Persist
    const updated = await window.api.reorderPlaylistTracks(playlistId, fromIndex, toIndex)
    if (updated) {
      const i = playlists.value.findIndex(p => p.id === playlistId)
      if (i >= 0) {
        playlists.value = [...playlists.value.slice(0, i), updated, ...playlists.value.slice(i + 1)]
      }
    }
  }

  function getPlaylistById(id: string) {
    return playlists.value.find(p => p.id === id) || null
  }

  /** Resolve a playlist's tracks. Smart playlists are evaluated dynamically. */
  function getPlaylistTracks(id: string): Track[] {
    const library = useLibraryStore()
    const pl = getPlaylistById(id)
    if (!pl) return []

    if (pl.smart && pl.rules && pl.rules.length > 0) {
      const getPlayCount = (key: string): number => {
        const statsStore = (window as any).__auroraStatsStore
        return statsStore ? statsStore.playCount(key) : 0
      }
      const tagsStore = useTagsStore()
      const getTrackTags = (trackId: string) => {
        const track = library.tracks.find(t => t.id === trackId)
        const trackTagList = tagsStore.getTrackTags(trackId)
        if (!track) return trackTagList
        const key = `${track.album}---${track.albumArtist || track.artist}`
        return [...new Set([...trackTagList, ...tagsStore.getAlbumTags(key)])]
      }
      return evaluateSmartPlaylist(library.tracks, pl.rules, pl.ruleMatch || 'all', getPlayCount, getTrackTags)
    }

    // Normal playlist — resolve by ID with metadata snapshot fallback
    const trackMap = new Map(library.tracks.map(t => [t.id, t]))
    const byMeta = new Map<string, Track>()
    for (const t of library.tracks) {
      const key = `${t.title}\0${t.artist}\0${t.album}`.toLowerCase()
      if (!byMeta.has(key)) byMeta.set(key, t)
    }
    return pl.trackIds
      .map(tid => {
        const direct = trackMap.get(tid)
        if (direct) return direct
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
        return list.sort((a, b) => {
          // For normal playlists use stored count for performance; smart playlists sort last
          const ca = a.smart ? -1 : a.trackIds.length
          const cb = b.smart ? -1 : b.trackIds.length
          return cb - ca
        })
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
    createSmartPlaylist,
    updateSmartPlaylistRules,
    deletePlaylist,
    renamePlaylist,
    addTracks,
    removeTrack,
    reorderTracks,
    getPlaylistById,
    getPlaylistTracks,
    setCustomImage,
    songKey,
  }
})
