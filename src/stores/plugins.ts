import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { PluginManifest, LoadedPlugin } from '@/types/plugin'
import { loadPlugin, unloadPlugin, getAllLoadedPlugins, unloadAllPlugins } from '@/plugins/loader'

export const usePluginStore = defineStore('plugins', () => {
  /** All discovered plugin manifests (installed on disk) */
  const manifests = shallowRef<PluginManifest[]>([])

  /** IDs of plugins the user has enabled */
  const enabledIds = ref<string[]>([])

  /** Currently loaded (active) plugins — kept in sync with the loader */
  const loaded = shallowRef<LoadedPlugin[]>([])

  // ── Discover installed plugins ──────────────────────────────────────────
  async function refreshManifests() {
    try {
      manifests.value = await window.api.pluginsGetAll()
    } catch {
      manifests.value = []
    }
  }

  // ── Restore enabled state from settings and load plugins ────────────────
  async function init() {
    await refreshManifests()

    try {
      const settings = await window.api.getSettings()
      enabledIds.value = settings.enabledPlugins ?? []
    } catch {
      enabledIds.value = []
    }

    // Load all enabled plugins
    for (const manifest of manifests.value) {
      if (enabledIds.value.includes(manifest.id)) {
        try {
          const pluginSettings = await window.api.pluginsGetSettings(manifest.id) || {}
          await loadPlugin(manifest, pluginSettings)
        } catch (err) {
          console.error(`[Aurora] Failed to load plugin "${manifest.id}":`, err)
        }
      }
    }

    _syncLoaded()
  }

  // ── Enable / disable a plugin ───────────────────────────────────────────
  async function enable(pluginId: string) {
    const manifest = manifests.value.find(m => m.id === pluginId)
    if (!manifest) return

    if (!enabledIds.value.includes(pluginId)) {
      enabledIds.value.push(pluginId)
    }

    try {
      const pluginSettings = await window.api.pluginsGetSettings(pluginId) || {}
      await loadPlugin(manifest, pluginSettings)
    } catch (err) {
      console.error(`[Aurora] Failed to enable plugin "${pluginId}":`, err)
    }

    _syncLoaded()
    await _persistEnabledIds()
  }

  async function disable(pluginId: string) {
    unloadPlugin(pluginId)
    enabledIds.value = enabledIds.value.filter(id => id !== pluginId)
    _syncLoaded()
    await _persistEnabledIds()
  }

  async function toggle(pluginId: string) {
    if (enabledIds.value.includes(pluginId)) {
      await disable(pluginId)
    } else {
      await enable(pluginId)
    }
  }

  // ── Install / remove plugins ────────────────────────────────────────────
  async function install(pluginPath: string) {
    await window.api.pluginsInstall(pluginPath)
    await refreshManifests()
  }

  async function remove(pluginId: string) {
    // Disable first if active
    if (enabledIds.value.includes(pluginId)) {
      await disable(pluginId)
    }
    await window.api.pluginsRemove(pluginId)
    await refreshManifests()
  }

  // ── Open the plugins folder ──────────────────────────────────────────────
  async function openPluginsFolder() {
    await window.api.pluginsOpenFolder()
  }

  // ── Tear down ───────────────────────────────────────────────────────────
  function destroyAll() {
    unloadAllPlugins()
    _syncLoaded()
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  function _syncLoaded() {
    loaded.value = getAllLoadedPlugins()
  }

  async function _persistEnabledIds() {
    try {
      await window.api.mergeSettings({ enabledPlugins: [...enabledIds.value] })
    } catch {}
  }

  return {
    manifests,
    enabledIds,
    loaded,
    init,
    refreshManifests,
    enable,
    disable,
    toggle,
    install,
    remove,
    openPluginsFolder,
    destroyAll,
  }
})
