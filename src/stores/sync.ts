import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePlaylistStore } from './playlist'
import { useFavoritesStore } from './favorites'
import { useTagsStore } from './tags'

interface SyncData {
  version: 1
  deviceId: string
  updatedAt: number
  playlists?: Playlist[]
  deletedPlaylistIds?: { id: string; deletedAt: number }[]
  favoriteIds?: string[]
  favoriteMeta?: Record<string, TrackMetaSnapshot>
  favoritesUpdatedAt?: number
  trackTags?: Record<string, string[]>
  albumTags?: Record<string, string[]>
}

export const useSyncStore = defineStore('sync', () => {
  const config = ref<SyncConfig>({
    enabled: false,
    folder: '',
    syncPlaylists: true,
    syncFavorites: true,
    syncStats: true,
    syncTags: true,
  })
  const lastSynced = ref(0)
  const syncing = ref(false)
  const syncError = ref<string | null>(null)

  let pushTimer: ReturnType<typeof setTimeout> | null = null

  async function loadConfig() {
    config.value = await window.api.syncGetConfig()
    if (config.value.enabled && config.value.folder) {
      await window.api.syncWatch(config.value.folder)
      window.api.onSyncFileChanged(onFileChanged)
    }
  }

  async function saveConfig(newConfig: SyncConfig) {
    config.value = newConfig
    await window.api.syncSetConfig(newConfig)
    window.api.removeSyncFileChangedListener()
    if (newConfig.enabled && newConfig.folder) {
      await window.api.syncWatch(newConfig.folder)
      window.api.onSyncFileChanged(onFileChanged)
    } else {
      await window.api.syncUnwatch()
    }
  }

  async function pickFolder(): Promise<string | null> {
    return window.api.syncPickFolder()
  }

  async function push() {
    if (!config.value.enabled || !config.value.folder) return
    if (syncing.value) return
    syncing.value = true
    syncError.value = null
    try {
      const playlistStore = usePlaylistStore()
      const favoritesStore = useFavoritesStore()
      const state = await window.api.syncGetState()

      const data: SyncData = {
        version: 1,
        deviceId: state.deviceId,
        updatedAt: Date.now(),
      }

      if (config.value.syncPlaylists) {
        data.playlists = JSON.parse(JSON.stringify(playlistStore.playlists))
        data.deletedPlaylistIds = state.deletedPlaylistIds
      }

      if (config.value.syncFavorites) {
        data.favoriteIds = [...favoritesStore.ids]
        data.favoriteMeta = Object.fromEntries(favoritesStore.meta)
        data.favoritesUpdatedAt = state.favoritesUpdatedAt
      }

      if (config.value.syncTags) {
        const tagsData = await window.api.getTags()
        data.trackTags = tagsData.trackTags
        data.albumTags = tagsData.albumTags
      }

      const result = await window.api.syncPush(data)
      if (result.ok) {
        // Push stats separately (per-device file in sync folder)
        if (config.value.syncStats) {
          const events = await window.api.syncGetStatsEvents()
          await window.api.syncPushStats(state.deviceId, events)
        }
        lastSynced.value = Date.now()
      } else {
        syncError.value = result.error || 'Push failed'
      }
    } catch (e: any) {
      syncError.value = e.message
    } finally {
      syncing.value = false
    }
  }

  async function pull() {
    if (!config.value.enabled || !config.value.folder) return
    if (syncing.value) return
    syncing.value = true
    syncError.value = null
    try {
      const result = await window.api.syncPull()
      if (result.error) { syncError.value = result.error; return }
      if (!result.data) return

      const data: SyncData = result.data
      const state = await window.api.syncGetState()

      // Skip if this is our own push
      if (data.deviceId === state.deviceId) {
        lastSynced.value = Date.now()
        return
      }

      const playlistStore = usePlaylistStore()
      const favoritesStore = useFavoritesStore()

      if (config.value.syncPlaylists && data.playlists) {
        // Per-playlist last-write-wins merge
        const merged = new Map(playlistStore.playlists.map(p => [p.id, p]))
        for (const syncPl of data.playlists) {
          const local = merged.get(syncPl.id)
          if (!local || syncPl.updatedAt > local.updatedAt) {
            merged.set(syncPl.id, syncPl)
          }
        }
        // Apply tombstones
        for (const tombstone of (data.deletedPlaylistIds ?? [])) {
          const local = merged.get(tombstone.id)
          if (local && tombstone.deletedAt > local.updatedAt) {
            merged.delete(tombstone.id)
          }
        }
        const finalPlaylists = Array.from(merged.values())
        await window.api.syncApplyPlaylists(finalPlaylists)
        playlistStore.playlists = finalPlaylists
      }

      if (config.value.syncFavorites && data.favoriteIds !== undefined && data.favoritesUpdatedAt) {
        if (data.favoritesUpdatedAt > (state.favoritesUpdatedAt ?? 0)) {
          await window.api.setFavorites(data.favoriteIds, data.favoriteMeta)
          await favoritesStore.load()
        }
      }

      if (config.value.syncTags && (data.trackTags || data.albumTags)) {
        const local = await window.api.getTags()
        const mergedTrackTags: Record<string, string[]> = { ...local.trackTags }
        for (const [id, remoteTags] of Object.entries(data.trackTags ?? {})) {
          const localTags = mergedTrackTags[id] ?? []
          mergedTrackTags[id] = Array.from(new Set([...localTags, ...remoteTags]))
        }
        const mergedAlbumTags: Record<string, string[]> = { ...local.albumTags }
        for (const [key, remoteTags] of Object.entries(data.albumTags ?? {})) {
          const localTags = mergedAlbumTags[key] ?? []
          mergedAlbumTags[key] = Array.from(new Set([...localTags, ...remoteTags]))
        }
        await window.api.applyTagsSync({ trackTags: mergedTrackTags, albumTags: mergedAlbumTags })
        await tagsStore.load()
      }

      // Pull stats from all other devices
      if (config.value.syncStats) {
        const remoteStats = await window.api.syncPullStats(state.deviceId)
        for (const { remoteDeviceId, events } of remoteStats) {
          await window.api.syncApplyRemoteStats(remoteDeviceId, events)
        }
        if (remoteStats.length > 0) {
          // Reload stats store with merged data
          const statsStore = (window as any).__auroraStatsStore
          if (statsStore) await statsStore.loadStats()
        }
      }

      lastSynced.value = Date.now()
    } catch (e: any) {
      syncError.value = e.message
    } finally {
      syncing.value = false
    }
  }

  function schedulePush() {
    if (!config.value.enabled) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(push, 2000)
  }

  function onFileChanged() {
    pull()
  }

  return {
    config,
    lastSynced,
    syncing,
    syncError,
    loadConfig,
    saveConfig,
    pickFolder,
    push,
    pull,
    schedulePush,
  }
})
