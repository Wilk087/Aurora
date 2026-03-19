/** Aurora plugin manifest — lives in manifest.json inside each plugin folder. */
export interface PluginManifest {
  /** Unique plugin identifier (kebab-case, e.g. "lastfm-scrobbler") */
  id: string
  /** Human-readable name */
  name: string
  /** Semver version string */
  version: string
  /** Author name */
  author: string
  /** Short description */
  description?: string
  /** Entry-point JS file relative to the plugin folder (default: "main.js") */
  main: string
  /** Optional CSS file injected into the renderer */
  style?: string
  /** Minimum Aurora version required (semver, e.g. "2.7.0") */
  minAuroraVersion?: string
  /** Lifecycle hooks the plugin wants */
  hooks?: PluginHook[]
  /** Optional schema describing user-facing settings */
  settingsSchema?: Record<string, PluginSettingField>
}

export type PluginHook =
  | 'onTrackChange'
  | 'onPlay'
  | 'onPause'
  | 'onQueueChange'
  | 'onVolumeChange'
  | 'onSeek'
  | 'onLibraryUpdate'
  | 'onImmersiveEnter'
  | 'onImmersiveExit'
  | 'onImmersiveSettingsChanged'

export interface PluginSettingField {
  type: 'string' | 'number' | 'boolean' | 'select'
  label: string
  description?: string
  default?: any
  options?: { label: string; value: string | number }[]
}

/** Runtime representation of a loaded plugin */
export interface LoadedPlugin {
  manifest: PluginManifest
  /** Exported lifecycle callbacks from the plugin code */
  exports: PluginExports
  /** Whether the user has enabled this plugin */
  enabled: boolean
  /** Plugin-specific user settings */
  settings: Record<string, any>
}

/** What a plugin's main.js can export */
export interface PluginExports {
  onTrackChange?: (track: any) => void
  onPlay?: () => void
  onPause?: () => void
  onQueueChange?: (queue: any[]) => void
  onVolumeChange?: (volume: number) => void
  onSeek?: (time: number) => void
  onLibraryUpdate?: (tracks: any[]) => void
  onImmersiveEnter?: () => void
  onImmersiveExit?: () => void
  onImmersiveSettingsChanged?: (settings: any) => void
  onActivate?: () => void
  onDeactivate?: () => void
  /** Plugin can return sidebar items to add */
  getSidebarItems?: () => PluginSidebarItem[]
}

export interface PluginSidebarItem {
  label: string
  /** SVG string for the icon */
  icon: string
  /** Callback when clicked */
  onClick: () => void
}

export interface PluginContextMenuItem {
  label: string
  /** SVG path `d` attribute string for the icon (24x24 viewBox) */
  icon?: string
  /** If true, a separator line is rendered before this item */
  separator?: boolean
  /**
   * Child items — renders this item as a hover-triggered submenu instead of a direct action.
   * When children are present, `onClick` is ignored.
   */
  children?: PluginContextMenuItem[]
  /** Called with the right-clicked track plus any other currently selected tracks */
  onClick: (tracks: Track[]) => void
}

export interface PluginAlbumContextMenuItem {
  label: string
  /** SVG path `d` attribute string for the icon (24x24 viewBox) */
  icon?: string
  /** If true, a separator line is rendered before this item */
  separator?: boolean
  /**
   * Child items — renders this item as a hover-triggered submenu instead of a direct action.
   * When children are present, `onClick` is ignored.
   */
  children?: PluginAlbumContextMenuItem[]
  /** Called with the right-clicked album object */
  onClick: (album: any) => void
}
