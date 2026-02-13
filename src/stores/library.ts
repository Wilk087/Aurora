import { defineStore } from 'pinia'
import { ref, shallowRef, computed, markRaw } from 'vue'

export type SortOrder = 'title' | 'artist' | 'album' | 'year' | 'duration'
export type AlbumSortOrder = 'name' | 'artist' | 'year' | 'tracks'

export interface Album {
  id: string
  name: string
  artist: string
  coverArt: string | null
  year: number
  tracks: Track[]
}

export interface Artist {
  name: string
  albums: Album[]
  trackCount: number
}

/** Strip diacritics for lenient matching: bôa → boa, Ñ → N, etc. */
function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export const useLibraryStore = defineStore('library', () => {
  const localTracks = shallowRef<Track[]>([])
  const subsonicTracks = shallowRef<Track[]>([])
  const tracks = computed<Track[]>(() => [...localTracks.value, ...subsonicTracks.value])
  const folders = ref<string[]>([])
  const isScanning = ref(false)
  const libraryReady = ref(false)
  const scanProgress = ref({ current: 0, total: 0 })
  const searchQuery = ref('')
  const sortOrder = ref<SortOrder>('title')
  const albumSortOrder = ref<AlbumSortOrder>('name')

  // ── Computed ─────────────────────────────────────────────────────────────
  const albums = computed<Album[]>(() => {
    const map = new Map<string, Album>()

    for (const track of tracks.value) {
      const key = `${track.album}---${track.albumArtist}`
      if (!map.has(key)) {
        map.set(key, {
          id: key.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
          name: track.album,
          artist: track.albumArtist,
          coverArt: track.coverArt,
          year: track.year,
          tracks: [],
        })
      }
      map.get(key)!.tracks.push(track)
    }

    for (const album of map.values()) {
      album.tracks.sort((a, b) => (a.disc !== b.disc ? a.disc - b.disc : a.track - b.track))
    }

    const list = Array.from(map.values())
    switch (albumSortOrder.value) {
      case 'artist':
        return list.sort((a, b) => a.artist.localeCompare(b.artist) || a.name.localeCompare(b.name))
      case 'year':
        return list.sort((a, b) => (b.year || 0) - (a.year || 0) || a.name.localeCompare(b.name))
      case 'tracks':
        return list.sort((a, b) => b.tracks.length - a.tracks.length || a.name.localeCompare(b.name))
      case 'name':
      default:
        return list.sort((a, b) => a.name.localeCompare(b.name))
    }
  })

  const filteredAlbums = computed<Album[]>(() => {
    if (!searchQuery.value) return albums.value
    const q = normalize(searchQuery.value)
    return albums.value.filter(
      (a) =>
        normalize(a.name).includes(q) ||
        normalize(a.artist).includes(q) ||
        a.tracks.some((t) => normalize(t.title).includes(q)),
    )
  })

  const artists = computed<Artist[]>(() => {
    const map = new Map<string, Artist>()
    for (const album of albums.value) {
      if (!map.has(album.artist)) {
        map.set(album.artist, { name: album.artist, albums: [], trackCount: 0 })
      }
      const artist = map.get(album.artist)!
      artist.albums.push(album)
      artist.trackCount += album.tracks.length
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  })

  const filteredTracks = computed(() => {
    if (!searchQuery.value) return tracks.value
    const q = normalize(searchQuery.value)
    return tracks.value.filter(
      (t) =>
        normalize(t.title).includes(q) ||
        normalize(t.artist).includes(q) ||
        normalize(t.album).includes(q),
    )
  })

  const sortedTracks = computed(() => {
    const list = [...filteredTracks.value]
    switch (sortOrder.value) {
      case 'artist':
        return list.sort((a, b) => a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album) || a.track - b.track)
      case 'album':
        return list.sort((a, b) => a.album.localeCompare(b.album) || a.disc - b.disc || a.track - b.track)
      case 'year':
        return list.sort((a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title))
      case 'duration':
        return list.sort((a, b) => a.duration - b.duration)
      case 'title':
      default:
        return list.sort((a, b) => a.title.localeCompare(b.title))
    }
  })

  /** Returns 'albums' if albums match best, 'songs' if only songs match, null if no results */
  const bestSearchTab = computed<'albums' | 'songs' | null>(() => {
    if (!searchQuery.value) return null
    const albumCount = filteredAlbums.value.length
    const trackCount = filteredTracks.value.length
    if (albumCount === 0 && trackCount === 0) return null
    if (albumCount > 0) return 'albums'
    return 'songs'
  })

  function setSortOrder(order: SortOrder) {
    sortOrder.value = order
    window.api.getSettings().then((s: any) => {
      s.sortOrder = order
      window.api.saveSettings(s)
    })
  }

  function setAlbumSortOrder(order: AlbumSortOrder) {
    albumSortOrder.value = order
    window.api.getSettings().then((s: any) => {
      s.albumSortOrder = order
      window.api.saveSettings(s)
    })
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  async function loadLibrary() {
    const [rawTracks, rawFolders] = await Promise.all([
      window.api.getLibrary(),
      window.api.getFolders(),
    ])
    localTracks.value = rawTracks.map((t: Track) => markRaw(t))
    folders.value = rawFolders
    libraryReady.value = true

    // Auto-load subsonic library if configured
    autoLoadSubsonic()
  }

  async function addFolder() {
    const folderPath = await window.api.openFolderDialog()
    if (!folderPath) return

    isScanning.value = true
    scanProgress.value = { current: 0, total: 0 }

    window.api.onScanProgress((data) => {
      scanProgress.value = data
    })

    try {
      const rawTracks = await window.api.scanFolder(folderPath)
      localTracks.value = rawTracks.map((t: Track) => markRaw(t))
      folders.value = await window.api.getFolders()
    } finally {
      isScanning.value = false
      window.api.removeScanProgressListener()
    }
  }

  async function removeFolder(folderPath: string) {
    const result = await window.api.removeFolder(folderPath)
    localTracks.value = result.tracks.map((t: Track) => markRaw(t))
    folders.value = result.folders
  }

  async function rescanAll() {
    isScanning.value = true
    scanProgress.value = { current: 0, total: 0 }
    window.api.onScanProgress((data) => {
      scanProgress.value = data
    })

    try {
      for (const folder of folders.value) {
        const rawTracks = await window.api.scanFolder(folder)
        localTracks.value = rawTracks.map((t: Track) => markRaw(t))
      }
      // Also re-fetch subsonic library if connected
      await autoLoadSubsonic()
    } finally {
      isScanning.value = false
      window.api.removeScanProgressListener()
    }
  }

  function getAlbumById(id: string): Album | undefined {
    return albums.value.find((a) => a.id === id)
  }

  /** Merge Subsonic tracks from server into the library */
  function mergeSubsonicTracks(rawTracks: Track[]) {
    subsonicTracks.value = rawTracks.map((t: Track) => markRaw({ ...t, source: 'subsonic' as const }))
  }

  /** Auto-load subsonic library if previously connected */
  async function autoLoadSubsonic() {
    try {
      const settings = await window.api.getSettings()
      if (settings.subsonicConnected && settings.subsonicUrl && settings.subsonicUsername && settings.subsonicPassword) {
        // Re-authenticate
        const ok = await window.api.subsonicTest({
          url: settings.subsonicUrl,
          username: settings.subsonicUsername,
          password: settings.subsonicPassword,
          useLegacyAuth: settings.subsonicLegacyAuth === true,
        })
        if (ok) {
          const remoteTracks = await window.api.subsonicFetchLibrary()
          mergeSubsonicTracks(remoteTracks)
        }
      }
    } catch {
      // Silently ignore — subsonic is optional
    }
  }

  return {
    tracks,
    folders,
    isScanning,
    libraryReady,
    scanProgress,
    searchQuery,
    sortOrder,
    albumSortOrder,
    albums,
    filteredAlbums,
    artists,
    filteredTracks,
    sortedTracks,
    bestSearchTab,
    loadLibrary,
    addFolder,
    removeFolder,
    rescanAll,
    getAlbumById,
    setSortOrder,
    setAlbumSortOrder,
    mergeSubsonicTracks,
  }
})
