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

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:set', settings),

  // Favorites
  getFavorites: (): Promise<string[]> => ipcRenderer.invoke('favorites:get'),
  toggleFavorite: (trackId: string): Promise<string[]> => ipcRenderer.invoke('favorites:toggle', trackId),
  setFavorites: (ids: string[]): Promise<string[]> => ipcRenderer.invoke('favorites:set', ids),

  // Discord RPC
  updateDiscordPresence: (data: any) => ipcRenderer.invoke('discord:update-presence', data),
  toggleDiscordRPC: (enabled: boolean, clientId?: string) => ipcRenderer.invoke('discord:toggle', enabled, clientId),

  // Playlists
  getPlaylists: () => ipcRenderer.invoke('playlists:get-all'),
  getPlaylist: (id: string) => ipcRenderer.invoke('playlists:get', id),
  createPlaylist: (name: string) => ipcRenderer.invoke('playlists:create', name),
  deletePlaylist: (id: string) => ipcRenderer.invoke('playlists:delete', id),
  renamePlaylist: (id: string, name: string) => ipcRenderer.invoke('playlists:rename', id, name),
  addTracksToPlaylist: (id: string, trackIds: string[]) => ipcRenderer.invoke('playlists:add-tracks', id, trackIds),
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

  // Utility – build a localfile:// URL for local file playback
  getMediaUrl: (filePath: string) => {
    // encodeURI doesn't encode #, ?, &, =, +, etc. which break URL parsing
    const encoded = encodeURI(filePath)
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
