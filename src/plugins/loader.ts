/**
 * Plugin loader — loads plugin code with full trust.
 *
 * No sandboxing. Plugins can access window, document, require, the full API,
 * and anything else in the renderer process. Users install plugins at their
 * own risk. This is intentional for maximum flexibility.
 */

import type { PluginManifest, PluginExports, LoadedPlugin } from '@/types/plugin'
import { createPluginAPI } from './api'
import { pluginBus } from './eventBus'

/** All currently loaded plugins */
const loaded = new Map<string, LoadedPlugin>()

/**
 * Load and activate a plugin.
 *
 * The plugin's main.js is expected to be a function body that receives
 * `aurora` (the Plugin API) and `exports` (an object to attach hooks to).
 *
 * Plugin code pattern:
 * ```js
 * // main.js
 * exports.onTrackChange = (track) => { ... }
 * exports.onPlay = () => { ... }
 * exports.onActivate = () => aurora.ui.toast.info('My plugin loaded!')
 * ```
 */
export async function loadPlugin(manifest: PluginManifest, settings: Record<string, any> = {}): Promise<LoadedPlugin> {
  // Read the plugin's JS source via IPC
  const code = await window.api.pluginsReadFile(manifest.id, manifest.main || 'main.js')
  const api = createPluginAPI(manifest.id)

  // Execute the plugin code — full trust, no sandbox
  const exports: PluginExports = {}
  try {
    const fn = new Function('aurora', 'exports', code)
    fn(api, exports)
  } catch (err) {
    console.error(`[Aurora] Failed to execute plugin "${manifest.id}":`, err)
    throw err
  }

  // Inject CSS if the plugin includes a stylesheet
  if (manifest.style) {
    try {
      const css = await window.api.pluginsReadFile(manifest.id, manifest.style)
      const styleEl = document.createElement('style')
      styleEl.dataset.auroraPlugin = manifest.id
      styleEl.textContent = css
      document.head.appendChild(styleEl)
    } catch (err) {
      console.warn(`[Aurora] Failed to load CSS for plugin "${manifest.id}":`, err)
    }
  }

  // Wire lifecycle hooks into the event bus
  if (exports.onTrackChange) pluginBus.on('trackChange', exports.onTrackChange)
  if (exports.onPlay) pluginBus.on('play', exports.onPlay)
  if (exports.onPause) pluginBus.on('pause', exports.onPause)
  if (exports.onQueueChange) pluginBus.on('queueChange', exports.onQueueChange)
  if (exports.onVolumeChange) pluginBus.on('volumeChange', exports.onVolumeChange)
  if (exports.onSeek) pluginBus.on('seek', exports.onSeek)
  if (exports.onLibraryUpdate) pluginBus.on('libraryUpdate', exports.onLibraryUpdate)

  // Call the activate hook
  if (exports.onActivate) {
    try { exports.onActivate() } catch (err) {
      console.error(`[Aurora] Plugin "${manifest.id}" onActivate error:`, err)
    }
  }

  const plugin: LoadedPlugin = {
    manifest,
    exports,
    enabled: true,
    settings,
  }

  loaded.set(manifest.id, plugin)
  return plugin
}

/** Deactivate and unload a plugin */
export function unloadPlugin(pluginId: string) {
  const plugin = loaded.get(pluginId)
  if (!plugin) return

  // Call deactivate hook
  if (plugin.exports.onDeactivate) {
    try { plugin.exports.onDeactivate() } catch (err) {
      console.error(`[Aurora] Plugin "${pluginId}" onDeactivate error:`, err)
    }
  }

  // Remove event bus listeners
  if (plugin.exports.onTrackChange) pluginBus.off('trackChange', plugin.exports.onTrackChange)
  if (plugin.exports.onPlay) pluginBus.off('play', plugin.exports.onPlay)
  if (plugin.exports.onPause) pluginBus.off('pause', plugin.exports.onPause)
  if (plugin.exports.onQueueChange) pluginBus.off('queueChange', plugin.exports.onQueueChange)
  if (plugin.exports.onVolumeChange) pluginBus.off('volumeChange', plugin.exports.onVolumeChange)
  if (plugin.exports.onSeek) pluginBus.off('seek', plugin.exports.onSeek)
  if (plugin.exports.onLibraryUpdate) pluginBus.off('libraryUpdate', plugin.exports.onLibraryUpdate)

  // Remove injected CSS
  const styleEl = document.querySelector(`style[data-aurora-plugin="${pluginId}"]`)
  if (styleEl) styleEl.remove()

  loaded.delete(pluginId)
}

/** Get a loaded plugin by id */
export function getLoadedPlugin(pluginId: string): LoadedPlugin | undefined {
  return loaded.get(pluginId)
}

/** Get all loaded plugins */
export function getAllLoadedPlugins(): LoadedPlugin[] {
  return Array.from(loaded.values())
}

/** Unload all plugins */
export function unloadAllPlugins() {
  for (const id of loaded.keys()) {
    unloadPlugin(id)
  }
}
