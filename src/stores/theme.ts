import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { type AuroraTheme, DEFAULT_THEME } from '@/types/theme'

export const useThemeStore = defineStore('theme', () => {
  /** All available themes (built-in + user-installed) */
  const themes = shallowRef<AuroraTheme[]>([DEFAULT_THEME])

  /** Currently active theme */
  const currentTheme = ref<AuroraTheme>(DEFAULT_THEME)

  /** Active CSS-only theme content (raw CSS string, empty = none) */
  const customCSS = ref('')

  // ── Apply a structured JSON theme ────────────────────────────────────────
  function applyTheme(theme: AuroraTheme) {
    const root = document.documentElement.style

    // Core colour variables
    root.setProperty('--accent', theme.colors.accent)
    root.setProperty('--accent-hover', theme.colors.accentHover)
    root.setProperty('--accent-dark', theme.colors.accentDark)
    root.setProperty('--bg-primary', theme.colors.bgPrimary)
    root.setProperty('--bg-secondary', theme.colors.bgSecondary)
    root.setProperty('--bg-tertiary', theme.colors.bgTertiary)
    root.setProperty('--text-primary', theme.colors.textPrimary)
    root.setProperty('--text-secondary', theme.colors.textSecondary)
    root.setProperty('--text-tertiary', theme.colors.textTertiary)
    root.setProperty('--border', theme.colors.border)

    // Glass overrides
    if (theme.glass?.background) root.setProperty('--glass-bg', theme.glass.background)
    if (theme.glass?.blur) root.setProperty('--glass-blur', theme.glass.blur)
    if (theme.glass?.saturate) root.setProperty('--glass-saturate', theme.glass.saturate)

    // Font overrides
    if (theme.fonts?.primary) root.setProperty('--font-primary', theme.fonts.primary)
    if (theme.fonts?.mono) root.setProperty('--font-mono', theme.fonts.mono)

    // Arbitrary custom properties
    for (const [key, val] of Object.entries(theme.custom ?? {})) {
      root.setProperty(`--aurora-${key}`, val)
    }

    currentTheme.value = theme
    _persistThemeChoice(theme.id)
  }

  // ── Reset to default theme ──────────────────────────────────────────────
  function resetTheme() {
    applyTheme(DEFAULT_THEME)
    unloadCustomCSS()
    _persistThemeChoice(DEFAULT_THEME.id)
  }

  // ── CSS-only themes (raw stylesheet injection) ──────────────────────────
  function loadCustomCSS(css: string) {
    let el = document.getElementById('aurora-user-theme') as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = 'aurora-user-theme'
      document.head.appendChild(el)
    }
    el.textContent = css
    customCSS.value = css
  }

  function unloadCustomCSS() {
    const el = document.getElementById('aurora-user-theme')
    if (el) el.remove()
    customCSS.value = ''
  }

  // ── Load available themes from disk via IPC ─────────────────────────────
  async function loadThemes() {
    try {
      const userThemes: AuroraTheme[] = await window.api.themesGetAll()
      themes.value = [DEFAULT_THEME, ...userThemes]
    } catch {
      themes.value = [DEFAULT_THEME]
    }
  }

  // ── Restore saved theme on startup ──────────────────────────────────────
  async function restoreTheme() {
    await loadThemes()
    try {
      const settings = await window.api.getSettings()
      const savedId: string | undefined = settings.themeId
      const savedCSS: string | undefined = settings.themeCustomCSS

      if (savedId && savedId !== DEFAULT_THEME.id) {
        const found = themes.value.find(t => t.id === savedId)
        if (found) applyTheme(found)
      }

      if (savedCSS) loadCustomCSS(savedCSS)
    } catch {}
  }

  // ── Install / remove themes ─────────────────────────────────────────────
  async function installTheme(theme: AuroraTheme) {
    await window.api.themesInstall(theme)
    await loadThemes()
  }

  async function removeTheme(themeId: string) {
    if (currentTheme.value.id === themeId) resetTheme()
    await window.api.themesRemove(themeId)
    await loadThemes()
  }

  // ── Open themes folder in system file manager ───────────────────────────
  async function openThemesFolder() {
    await window.api.themesOpenFolder()
  }

  // ── Listen for file-system changes in the themes directory ──────────────
  function watchThemesDirectory() {
    window.api.onThemesDirectoryChanged(async () => {
      await loadThemes()
    })
  }

  function unwatchThemesDirectory() {
    window.api.removeThemesDirectoryChangedListener()
  }

  // ── Persist the selected theme id to settings ───────────────────────────
  async function _persistThemeChoice(themeId: string) {
    try {
      const settings = await window.api.getSettings()
      settings.themeId = themeId
      if (customCSS.value) settings.themeCustomCSS = customCSS.value
      else delete settings.themeCustomCSS
      await window.api.saveSettings(settings)
    } catch {}
  }

  return {
    themes,
    currentTheme,
    customCSS,
    applyTheme,
    resetTheme,
    loadCustomCSS,
    unloadCustomCSS,
    loadThemes,
    restoreTheme,
    installTheme,
    removeTheme,
    openThemesFolder,
    watchThemesDirectory,
    unwatchThemesDirectory,
  }
})
