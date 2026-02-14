import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Library
  scanFolder: (path: string) => ipcRenderer.invoke('library:scan-folder', path),
  getLibrary: () => ipcRenderer.invoke('library:get-data'),
  getFolders: () => ipcRenderer.invoke('library:get-folders'),
  removeFolder: (path: string) => ipcRenderer.invoke('library:remove-folder', path),
  openFolderDialog: () => ipcRenderer.invoke('dialog:open-folder'),

  // Lyrics
  getLyrics: (trackPath: string) => ipcRenderer.invoke('lyrics:get', trackPath),
  fetchOnlineLyrics: (trackInfo: { path: string; title: string; artist: string; album: string; duration: number }) =>
    ipcRenderer.invoke('lyrics:fetch-online', trackInfo),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  enterFullscreen: () => ipcRenderer.send('window:enter-fullscreen'),
  exitFullscreen: () => ipcRenderer.send('window:exit-fullscreen'),

  // Window state events (OS-level maximize/fullscreen)
  onWindowStateChange: (callback: (state: { maximized: boolean; fullscreen: boolean }) => void) => {
    ipcRenderer.on('window:state-changed', (_, state) => callback(state))
  },
  removeWindowStateChangeListener: () => {
    ipcRenderer.removeAllListeners('window:state-changed')
  },

  // App lifecycle
  relaunchApp: () => ipcRenderer.send('app:relaunch'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:set', settings),

  // Favorites
  getFavorites: (): Promise<{ ids: string[]; meta: Record<string, { title: string; artist: string; album: string }> }> => ipcRenderer.invoke('favorites:get'),
  toggleFavorite: (trackId: string, meta?: { title: string; artist: string; album: string }): Promise<{ ids: string[]; meta: Record<string, { title: string; artist: string; album: string }> }> => ipcRenderer.invoke('favorites:toggle', trackId, meta),
  setFavorites: (ids: string[], meta?: Record<string, { title: string; artist: string; album: string }>): Promise<{ ids: string[]; meta: Record<string, { title: string; artist: string; album: string }> }> => ipcRenderer.invoke('favorites:set', ids, meta),

  // Discord RPC
  updateDiscordPresence: (data: any) => ipcRenderer.invoke('discord:update-presence', data),
  toggleDiscordRPC: (enabled: boolean, clientId?: string) => ipcRenderer.invoke('discord:toggle', enabled, clientId),

  // Playlists
  getPlaylists: () => ipcRenderer.invoke('playlists:get-all'),
  getPlaylist: (id: string) => ipcRenderer.invoke('playlists:get', id),
  createPlaylist: (name: string) => ipcRenderer.invoke('playlists:create', name),
  deletePlaylist: (id: string) => ipcRenderer.invoke('playlists:delete', id),
  renamePlaylist: (id: string, name: string) => ipcRenderer.invoke('playlists:rename', id, name),
  addTracksToPlaylist: (id: string, trackIds: string[], trackMeta?: Record<string, { title: string; artist: string; album: string }>) => ipcRenderer.invoke('playlists:add-tracks', id, trackIds, trackMeta),
  removeTrackFromPlaylist: (id: string, trackId: string) => ipcRenderer.invoke('playlists:remove-track', id, trackId),

  // Credits / extended metadata
  getTrackCredits: (trackPath: string) => ipcRenderer.invoke('track:get-credits', trackPath),

  // Waveform generation
  generateWaveform: (trackPath: string): Promise<number[]> => ipcRenderer.invoke('track:generate-waveform', trackPath),

  // Artist info
  getArtistInfo: (artistName: string) => ipcRenderer.invoke('artist:get-info', artistName),

  // Folder tree
  getFolderTree: (folderPath: string) => ipcRenderer.invoke('folder:get-tree', folderPath),

  // Scrobbling
  scrobbleTrack: (data: { title: string; artist: string; album: string; duration: number; timestamp: number }) =>
    ipcRenderer.invoke('scrobble:track', data),
  updateNowPlaying: (data: { title: string; artist: string; album: string; duration: number }) =>
    ipcRenderer.invoke('scrobble:now-playing', data),

  // Smart playlists
  createSmartPlaylist: (name: string, rules: any[], ruleMatch: string) =>
    ipcRenderer.invoke('playlists:create-smart', name, rules, ruleMatch),
  updateSmartPlaylist: (id: string, rules: any[], ruleMatch: string) =>
    ipcRenderer.invoke('playlists:update-smart', id, rules, ruleMatch),

  // Cache management
  resetCache: (targets: string[]): Promise<Record<string, boolean>> => ipcRenderer.invoke('cache:reset', targets),

  // File explorer
  showInExplorer: (filePath: string) => ipcRenderer.invoke('shell:show-in-explorer', filePath),
  openPath: (dirPath: string) => ipcRenderer.invoke('shell:open-path', dirPath),

  // Export / Import
  exportRun: (customPath?: string): Promise<string> => ipcRenderer.invoke('export:run', customPath),
  exportImport: (): Promise<{ settings: boolean; favorites: number; playlists: number } | null> => ipcRenderer.invoke('export:import'),
  exportChooseDir: (): Promise<string | null> => ipcRenderer.invoke('export:choose-dir'),
  exportGetDefaultPath: (): Promise<string> => ipcRenderer.invoke('export:get-default-path'),

  // Subsonic / Navidrome
  subsonicTest: (config: { url: string; username: string; password: string; useLegacyAuth: boolean }) =>
    ipcRenderer.invoke('subsonic:test', config),
  subsonicFetchLibrary: (): Promise<any[]> => ipcRenderer.invoke('subsonic:fetch-library'),
  subsonicGetStreamUrl: (songId: string): Promise<string> => ipcRenderer.invoke('subsonic:stream-url', songId),
  subsonicGetCoverUrl: (coverArtId: string): Promise<string> => ipcRenderer.invoke('subsonic:cover-url', coverArtId),

  // Save lyrics
  saveLyrics: (trackPath: string, lrcContent: string) => ipcRenderer.invoke('lyrics:save', trackPath, lrcContent),

  // App version & update checking
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  checkForUpdate: (): Promise<{ currentVersion: string; latestVersion: string; url: string } | null> => ipcRenderer.invoke('app:check-update'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:open-external', url),

  // Utility – build a localfile:// URL for local file playback (pass through http(s) URLs)
  getMediaUrl: (filePath: string) => {
    if (!filePath) return ''
    // Pass through HTTP(S) URLs (e.g. subsonic cover art or streams)
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath
    // Normalize Windows backslashes to forward slashes
    let normalized = filePath.replace(/\\/g, '/')
    // Ensure path starts with / so drive letters aren't parsed as URL host
    // (Windows: C:/Users/... → /C:/Users/..., Linux already starts with /)
    if (!normalized.startsWith('/')) normalized = '/' + normalized
    // encodeURI doesn't encode #, ?, &, =, +, etc. which break URL parsing
    const encoded = encodeURI(normalized)
      .replace(/#/g, '%23')
      .replace(/\?/g, '%3F')
      .replace(/&/g, '%26')
      .replace(/\+/g, '%2B')
      .replace(/=/g, '%3D')
    return `localfile://${encoded}`
  },

  // Events
  onScanProgress: (callback: (data: { current: number; total: number }) => void) => {
    ipcRenderer.on('library:scan-progress', (_, data) => callback(data))
  },
  removeScanProgressListener: () => {
    ipcRenderer.removeAllListeners('library:scan-progress')
  },

  // MPRIS (renderer → main)
  mprisSendMetadata: (data: { title?: string; artist?: string; album?: string; artUrl?: string; length?: number; trackId?: string }) =>
    ipcRenderer.send('mpris:metadata', data),
  mprisSendPlaybackStatus: (status: 'Playing' | 'Paused' | 'Stopped') =>
    ipcRenderer.send('mpris:playback-status', status),
  mprisSendPosition: (seconds: number) =>
    ipcRenderer.send('mpris:position', seconds),
  mprisSendVolume: (vol: number) =>
    ipcRenderer.send('mpris:volume', vol),
  mprisSendLoopStatus: (mode: string) =>
    ipcRenderer.send('mpris:loop-status', mode),
  mprisSendShuffle: (enabled: boolean) =>
    ipcRenderer.send('mpris:shuffle', enabled),
  mprisSendSeeked: (seconds: number) =>
    ipcRenderer.send('mpris:seeked', seconds),
  getCoverFileUrl: (coverPath: string): Promise<string> =>
    ipcRenderer.invoke('mpris:cover-path', coverPath),

  // MPRIS commands (main → renderer)
  onMprisCommand: (callback: (command: string, data?: any) => void) => {
    ipcRenderer.on('mpris:command', (_, command, data) => callback(command, data))
  },
  removeMprisCommandListener: () => {
    ipcRenderer.removeAllListeners('mpris:command')
  },
})
