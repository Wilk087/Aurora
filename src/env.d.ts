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
  source?: 'local' | 'subsonic'
  // Extended metadata for credits
  composer?: string
  lyricist?: string
  conductor?: string
  producer?: string
  engineer?: string
  mixer?: string
  remixer?: string
  label?: string
  copyright?: string
  encodedBy?: string
  comment?: string
  bpm?: number
}

interface TrackCredits {
  composer: string[]
  lyricist: string[]
  conductor: string[]
  producer: string[]
  engineer: string[]
  mixer: string[]
  remixer: string[]
  writer: string[]
  label: string[]
  copyright: string
  encodedBy: string
  comment: string
  bpm: number | null
  bitrate: number | null
  sampleRate: number | null
  codec: string
  lossless: boolean
}

interface ArtistInfo {
  name: string
  disambiguation?: string
  type?: string
  country?: string
  beginDate?: string
  endDate?: string
  tags?: string[]
  bio?: string
  imageUrl?: string | null
}

interface SmartPlaylistRule {
  field: 'genre' | 'year' | 'artist' | 'album' | 'duration' | 'title' | 'bpm'
  operator: 'is' | 'contains' | 'gt' | 'lt' | 'between' | 'equals' | 'greater' | 'less' | 'starts'
  value: string
  value2?: string // for 'between'
}

interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
  updatedAt: number
  smart?: boolean
  rules?: SmartPlaylistRule[]
  ruleMatch?: 'all' | 'any'
}

interface FolderEntry {
  name: string
  path: string
  isDirectory: boolean
  children?: FolderEntry[]
  trackCount?: number
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
    // Favorites
    getFavorites: () => Promise<string[]>
    toggleFavorite: (trackId: string) => Promise<string[]>
    setFavorites: (ids: string[]) => Promise<string[]>
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
    // Credits
    getTrackCredits: (trackPath: string) => Promise<TrackCredits>
    // Waveform
    generateWaveform: (trackPath: string) => Promise<number[]>
    // Artist info
    getArtistInfo: (artistName: string) => Promise<ArtistInfo | null>
    // Folder structure
    getFolderTree: (folderPath: string) => Promise<FolderEntry[]>
    // Scrobbling
    scrobbleTrack: (data: { title: string; artist: string; album: string; duration: number; timestamp: number }) => Promise<boolean>
    updateNowPlaying: (data: { title: string; artist: string; album: string; duration: number }) => Promise<boolean>
    // Smart playlists
    createSmartPlaylist: (name: string, rules: SmartPlaylistRule[], ruleMatch: 'all' | 'any') => Promise<Playlist>
    updateSmartPlaylist: (id: string, rules: SmartPlaylistRule[], ruleMatch: 'all' | 'any') => Promise<Playlist | null>
    // Cache management
    resetCache: (targets: string[]) => Promise<Record<string, boolean>>
    // File explorer
    showInExplorer: (filePath: string) => Promise<void>
    // MPRIS (renderer → main)
    mprisSendMetadata: (data: { title?: string; artist?: string; album?: string; artUrl?: string; length?: number; trackId?: string }) => void
    mprisSendPlaybackStatus: (status: 'Playing' | 'Paused' | 'Stopped') => void
    mprisSendPosition: (seconds: number) => void
    mprisSendVolume: (vol: number) => void
    mprisSendLoopStatus: (mode: string) => void
    mprisSendShuffle: (enabled: boolean) => void
    mprisSendSeeked: (seconds: number) => void
    getCoverFileUrl: (coverPath: string) => Promise<string>
    // MPRIS commands (main → renderer)
    onMprisCommand: (callback: (command: string, data?: any) => void) => void
    removeMprisCommandListener: () => void
    // Subsonic / Navidrome
    subsonicTest: (config: { url: string; username: string; password: string; useLegacyAuth: boolean }) => Promise<boolean>
    subsonicFetchLibrary: () => Promise<Track[]>
    subsonicGetStreamUrl: (songId: string) => Promise<string>
    subsonicGetCoverUrl: (coverArtId: string) => Promise<string>
    // LRC save
    saveLyrics: (trackPath: string, lrcContent: string) => Promise<void>
  }
}
