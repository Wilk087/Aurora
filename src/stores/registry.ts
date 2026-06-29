import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RegistryPlugin, RegistryTheme, RegistryIndex } from '@/types/registry'
import { usePluginStore } from '@/stores/plugins'
import { useThemeStore } from '@/stores/theme'

function semverGt(a: string, b: string): boolean {
  const pa = a.split(/[.-]/).map(s => parseInt(s) || 0)
  const pb = b.split(/[.-]/).map(s => parseInt(s) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] ?? 0
    const vb = pb[i] ?? 0
    if (va !== vb) return va > vb
  }
  return false
}

export const useRegistryStore = defineStore('registry', () => {
  const plugins = ref<RegistryPlugin[]>([])
  const themes = ref<RegistryTheme[]>([])
  const updatedAt = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const installingIds = ref<Set<string>>(new Set())

  const pluginStore = usePluginStore()
  const themeStore = useThemeStore()

  const pluginsWithStatus = computed(() =>
    plugins.value.map(p => {
      const installed = pluginStore.manifests.find(m => m.id === p.id)
      const updateAvailable = installed ? semverGt(p.version, installed.version) : false
      return { ...p, installed: !!installed, installedVersion: installed?.version, updateAvailable }
    })
  )

  const themesWithStatus = computed(() =>
    themes.value.map(t => {
      const installed = themeStore.themes.find(th => th.id === t.id)
      const isDefault = t.id === 'aurora-default'
      const updateAvailable = installed && !isDefault ? semverGt(t.version, installed.version ?? '0.0.0') : false
      return { ...t, installed: !!installed, installedVersion: (installed as any)?.version, updateAvailable }
    })
  )

  async function fetch(forceRefresh = false) {
    loading.value = true
    error.value = null
    try {
      const data: RegistryIndex = await window.api.registryFetch(forceRefresh)
      plugins.value = data.plugins ?? []
      themes.value = data.themes ?? []
      updatedAt.value = data.updatedAt ?? null
    } catch (err: any) {
      error.value = err?.message ?? 'Failed to load registry'
    } finally {
      loading.value = false
    }
  }

  async function installPlugin(plugin: RegistryPlugin) {
    if (installingIds.value.has(plugin.id)) return
    installingIds.value = new Set([...installingIds.value, plugin.id])
    try {
      await window.api.registryInstallPlugin(plugin.downloadUrl)
      await pluginStore.refreshManifests()
    } finally {
      const next = new Set(installingIds.value)
      next.delete(plugin.id)
      installingIds.value = next
    }
  }

  async function updatePlugin(plugin: RegistryPlugin) {
    if (installingIds.value.has(plugin.id)) return
    installingIds.value = new Set([...installingIds.value, plugin.id])
    try {
      // Disable + remove existing, then install fresh
      if (pluginStore.enabledIds.includes(plugin.id)) {
        await pluginStore.disable(plugin.id)
      }
      await window.api.pluginsRemove(plugin.id)
      await window.api.registryInstallPlugin(plugin.downloadUrl)
      await pluginStore.refreshManifests()
    } finally {
      const next = new Set(installingIds.value)
      next.delete(plugin.id)
      installingIds.value = next
    }
  }

  async function installTheme(theme: RegistryTheme) {
    if (installingIds.value.has(theme.id)) return
    installingIds.value = new Set([...installingIds.value, theme.id])
    try {
      await window.api.registryInstallTheme(theme.downloadUrl)
      await themeStore.loadThemes()
    } finally {
      const next = new Set(installingIds.value)
      next.delete(theme.id)
      installingIds.value = next
    }
  }

  async function updateTheme(theme: RegistryTheme) {
    return installTheme(theme)
  }

  function isInstalling(id: string) {
    return installingIds.value.has(id)
  }

  return {
    plugins,
    themes,
    updatedAt,
    loading,
    error,
    pluginsWithStatus,
    themesWithStatus,
    fetch,
    installPlugin,
    updatePlugin,
    installTheme,
    updateTheme,
    isInstalling,
  }
})
