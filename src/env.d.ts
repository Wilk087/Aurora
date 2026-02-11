/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Track {
  id: string
  path: string
  title: string
  artist: string
  album: string
  albumArtist: string
  track: number
  disc: number
  duration: number
  genre: string
  year: number
  coverArt: string | null
}

interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
  updatedAt: number
}

interface Window {
  api: {
    scanFolder: (path: string) => Promise<Track[]>
    getLibrary: () => Promise<Track[]>
    getFolders: () => Promise<string[]>
    removeFolder: (path: string) => Promise<{ folders: string[]; tracks: Track[] }>
    openFolderDialog: () => Promise<string | null>
    getLyrics: (trackPath: string) => Promise<string | null>
    fetchOnlineLyrics: (trackInfo: { path: string; title: string; artist: string; album: string; duration: number }) => Promise<string | null>
    minimize: () => void
    maximize: () => void
    close: () => void
    enterFullscreen: () => void
    exitFullscreen: () => void
    getSettings: () => Promise<any>
    saveSettings: (settings: any) => Promise<void>
    updateDiscordPresence: (data: any) => Promise<void>
    toggleDiscordRPC: (enabled: boolean, clientId?: string) => Promise<void>
    getPlaylists: () => Promise<Playlist[]>
    getPlaylist: (id: string) => Promise<Playlist | null>
    createPlaylist: (name: string) => Promise<Playlist>
    deletePlaylist: (id: string) => Promise<Playlist[]>
    renamePlaylist: (id: string, name: string) => Promise<Playlist | null>
    addTracksToPlaylist: (id: string, trackIds: string[]) => Promise<Playlist | null>
    removeTrackFromPlaylist: (id: string, trackId: string) => Promise<Playlist | null>
    getMediaUrl: (filePath: string) => string
    onScanProgress: (callback: (data: { current: number; total: number }) => void) => void
    removeScanProgressListener: () => void
  }
}
