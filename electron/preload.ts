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

  // Utility – build a localfile:// URL for local file playback
  // encodeURI doesn't encode # or ? which break URL parsing, so we handle them.
  getMediaUrl: (filePath: string) => `localfile://${encodeURI(filePath).replace(/#/g, '%23').replace(/\?/g, '%3F')}`,

  // Events
  onScanProgress: (callback: (data: { current: number; total: number }) => void) => {
    ipcRenderer.on('library:scan-progress', (_, data) => callback(data))
  },
  removeScanProgressListener: () => {
    ipcRenderer.removeAllListeners('library:scan-progress')
  },
})
