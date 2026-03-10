/**
 * Plugin API — the `aurora` object every plugin receives.
 *
 * Plugins run with FULL trust (no sandbox). The user is responsible for
 * vetting plugins they install. This is intentional — Aurora is open source,
 * local-only, and we want plugin authors to have maximum freedom.
 */

import { pluginBus } from './eventBus'
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'
import { usePlaylistStore } from '@/stores/playlist'
import { useFavoritesStore } from '@/stores/favorites'
import { useThemeStore } from '@/stores/theme'
import { useToast } from '@/composables/useToast'
import type { PluginSidebarItem, PluginSettingField } from '@/types/plugin'

/** Registry of sidebar items added by plugins */
const _sidebarItems = new Map<string, PluginSidebarItem[]>()

/** Registry of settings schemas registered at runtime by plugins */
const _settingsSchemas = new Map<string, Record<string, PluginSettingField>>()

/** Settings change listeners per plugin */
const _settingsListeners = new Map<string, Set<(key: string, value: any) => void>>()

export function getPluginSidebarItems(): PluginSidebarItem[] {
  return Array.from(_sidebarItems.values()).flat()
}

export function getPluginSettingsSchema(pluginId: string): Record<string, PluginSettingField> | undefined {
  return _settingsSchemas.get(pluginId)
}

/** Called from Settings UI when user changes a plugin setting */
export function notifyPluginSettingChanged(pluginId: string, key: string, value: any) {
  const listeners = _settingsListeners.get(pluginId)
  if (listeners) {
    for (const fn of listeners) {
      try { fn(key, value) } catch {}
    }
  }
}

/**
 * Build the `aurora` API object for a given plugin.
 *
 * Plugins get direct access to Pinia stores. No sandbox, no restrictions —
 * use at your own risk.
 */
export function createPluginAPI(pluginId: string) {
  const player = usePlayerStore()
  const library = useLibraryStore()
  const playlists = usePlaylistStore()
  const favorites = useFavoritesStore()
  const theme = useThemeStore()
  const toast = useToast()

  return {
    // ── Player ───────────────────────────────────────────────────────────
    player: {
      get currentTrack() { return player.currentTrack },
      get isPlaying() { return player.isPlaying },
      get currentTime() { return player.currentTime },
      get duration() { return player.duration },
      get volume() { return player.volume },
      get queue() { return player.queue },
      get currentIndex() { return player.currentIndex },

      play: player.play.bind(player),
      pause: player.pause.bind(player),
      togglePlay: player.togglePlay.bind(player),
      next: player.next.bind(player),
      previous: player.previous.bind(player),
      seek: player.seek.bind(player),
      setVolume: player.setVolume.bind(player),
      playAll: player.playAll.bind(player),
      addToQueue: player.addToQueue.bind(player),
      playNext: player.playNext.bind(player),
      playLater: player.playLater.bind(player),
    },

    // ── Library ──────────────────────────────────────────────────────────
    library: {
      get tracks() { return library.tracks },
      get albums() { return library.albums },
      get artists() { return library.artists },
      get searchQuery() { return library.searchQuery },
      set searchQuery(q: string) { library.searchQuery = q },
    },

    // ── Playlists ────────────────────────────────────────────────────────
    playlists: {
      get all() { return playlists.sortedPlaylists },
      create: playlists.createPlaylist.bind(playlists),
      delete: playlists.deletePlaylist.bind(playlists),
      rename: playlists.renamePlaylist.bind(playlists),
      addTracks: playlists.addTracks.bind(playlists),
      getPlaylistTracks: playlists.getPlaylistTracks.bind(playlists),
    },

    // ── Favorites ────────────────────────────────────────────────────────
    favorites: {
      get ids() { return favorites.ids },
      isFavorite: favorites.isFavorite.bind(favorites),
      toggle: favorites.toggle.bind(favorites),
    },

    // ── Theme ────────────────────────────────────────────────────────────
    theme: {
      get current() { return theme.currentTheme },
      get all() { return theme.themes },
      apply: theme.applyTheme.bind(theme),
      reset: theme.resetTheme.bind(theme),
      injectCSS: theme.loadCustomCSS.bind(theme),
    },

    // ── Events ───────────────────────────────────────────────────────────
    on(event: string, handler: (...args: any[]) => void) {
      pluginBus.on(event, handler)
    },
    off(event: string, handler: (...args: any[]) => void) {
      pluginBus.off(event, handler)
    },

    // ── UI helpers ───────────────────────────────────────────────────────
    ui: {
      toast: {
        success: toast.success,
        info: toast.info,
        warning: toast.warning,
        error: toast.error,
      },
      addSidebarItems(items: PluginSidebarItem[]) {
        _sidebarItems.set(pluginId, items)
      },
      removeSidebarItems() {
        _sidebarItems.delete(pluginId)
      },
      /**
       * Get a dedicated plugin slot container inside the PlayerBar.
       * @param position 'left' (between track info & transport) or 'right' (between transport & volume)
       * @returns The DOM element, or null if the playerbar isn't mounted yet.
       */
      getPlayerBarSlot(position: 'left' | 'right' = 'right'): HTMLElement | null {
        return document.getElementById(`aurora-playerbar-${position}-slot`)
      },
      /**
       * Get a plugin slot inside the immersive / fullscreen view.
       * @param position 'right' (next to track info in default layout) or 'modern-right' (modern controls layout)
       * @returns The DOM element, or null if the fullscreen view isn't mounted.
       */
      getImmersiveSlot(position: 'right' | 'modern-right' = 'right'): HTMLElement | null {
        return document.getElementById(`aurora-immersive-${position}-slot`)
      },
      /**
       * Get the settings slot inside the immersive settings panel.
       * Plugins can append their own DOM controls here.
       */
      getImmersiveSettingsSlot(): HTMLElement | null {
        return document.getElementById('aurora-immersive-settings-slot')
      },
    },

    // ── Settings (declared schema, persisted per-plugin) ─────────────────
    settings: {
      /**
       * Register a settings schema at runtime.
       * This is an alternative to declaring `settingsSchema` in manifest.json.
       * The schema is merged (runtime wins) and shown in the Settings UI.
       */
      register(schema: Record<string, PluginSettingField>) {
        _settingsSchemas.set(pluginId, { ..._settingsSchemas.get(pluginId), ...schema })
      },
      /** Get the current value for a setting key (falls back to schema default) */
      async get(key: string): Promise<any> {
        const all = await window.api.pluginsGetSettings(pluginId) || {}
        if (key in all) return all[key]
        const schema = _settingsSchemas.get(pluginId)
        return schema?.[key]?.default
      },
      /** Save a single setting */
      async set(key: string, value: any): Promise<void> {
        const current = await window.api.pluginsGetSettings(pluginId) || {}
        current[key] = value
        await window.api.pluginsSaveSettings(pluginId, current)
        // Notify in-process listeners
        notifyPluginSettingChanged(pluginId, key, value)
      },
      /** Get all saved settings (merged with schema defaults) */
      async getAll(): Promise<Record<string, any>> {
        const saved = await window.api.pluginsGetSettings(pluginId) || {}
        const schema = _settingsSchemas.get(pluginId) ?? {}
        const merged: Record<string, any> = {}
        for (const [k, field] of Object.entries(schema)) {
          merged[k] = k in saved ? saved[k] : field.default
        }
        // Include anything saved that's not in schema
        for (const [k, v] of Object.entries(saved)) {
          if (!(k in merged)) merged[k] = v
        }
        return merged
      },
      /** Listen for setting changes (from Settings UI or programmatic) */
      onChange(handler: (key: string, value: any) => void) {
        if (!_settingsListeners.has(pluginId)) _settingsListeners.set(pluginId, new Set())
        _settingsListeners.get(pluginId)!.add(handler)
      },
      offChange(handler: (key: string, value: any) => void) {
        _settingsListeners.get(pluginId)?.delete(handler)
      },
    },

    // ── Storage (per-plugin, persisted via IPC) ──────────────────────────
    storage: {
      async get(key: string): Promise<any> {
        return window.api.pluginsGetSettings(pluginId).then(s => s?.[key])
      },
      async set(key: string, value: any): Promise<void> {
        const current = await window.api.pluginsGetSettings(pluginId) || {}
        current[key] = value
        await window.api.pluginsSaveSettings(pluginId, current)
      },
      async getAll(): Promise<Record<string, any>> {
        return window.api.pluginsGetSettings(pluginId) || {}
      },
      async setAll(data: Record<string, any>): Promise<void> {
        await window.api.pluginsSaveSettings(pluginId, data)
      },
    },

    // ── Electron / Node access (full trust, use at own risk) ─────────────
    /** Direct IPC invoke — call any main-process handler */
    ipc: {
      invoke: (channel: string, ...args: any[]) => window.api.pluginsIpcInvoke(channel, ...args),
      send: (channel: string, ...args: any[]) => window.api.pluginsIpcSend(channel, ...args),
    },

    // ── Utility ──────────────────────────────────────────────────────────
    /** App version string */
    version: __APP_VERSION__,
  }
}
