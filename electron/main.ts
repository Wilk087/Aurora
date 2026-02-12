import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, screen } from 'electron'
import { join, extname, basename, dirname } from 'path'
import { readdir, readFile, writeFile, mkdir, stat, rm, copyFile } from 'fs/promises'
import { existsSync, createReadStream } from 'fs'
import { createHash } from 'crypto'
import { request as httpsRequest, get as httpsGet } from 'https'
import {
  initMpris, destroyMpris, updateMprisMetadata, updateMprisPlaybackStatus,
  updateMprisPosition, updateMprisVolume, updateMprisLoopStatus, updateMprisShuffle,
  emitMprisSeeked,
} from './mpris'
import {
  setSubsonicConfig, subsonicPing, subsonicGetAllSongs,
  getStreamUrl, getCoverArtUrl,
} from './subsonic'

// ── Discord Rich Presence ──────────────────────────────────────────────────
// Uses discord-rpc to show what's currently playing
// Default client ID – users can create their own Discord App at discord.com/developers
let discordClientId = '1338909498498850836'
let rpcClient: any = null
let rpcReady = false

async function initDiscordRPC(clientId?: string) {
  if (clientId) discordClientId = clientId
  // Destroy existing connection if any
  await destroyDiscordRPC()
  
  try {
    const { Client } = await import('@xhayper/discord-rpc')
    rpcClient = new Client({ clientId: discordClientId })

    rpcClient.on('ready', () => {
      rpcReady = true
      console.log('Discord RPC connected')
    })

    rpcClient.on('disconnected', () => {
      rpcReady = false
    })

    await rpcClient.login()
  } catch (err) {
    console.log('Discord RPC not available (Discord not running?):', (err as Error).message)
    rpcReady = false
  }
}

// ── Album art URL lookup (for Discord RPC) ────────────────────────────────
const albumArtCache = new Map<string, string | null>()

function fetchJSON(url: string, retries = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpsGet(url, {
      headers: {
        'User-Agent': 'AuroraPlayer/1.0.0 (https://github.com/Wilk087/Aurora)',
        'Accept': 'application/json',
      },
      timeout: 10000,
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location, retries).then(resolve, reject)
      }
      if (res.statusCode && res.statusCode === 503 && retries > 0) {
        // Rate limited — wait and retry
        setTimeout(() => fetchJSON(url, retries - 1).then(resolve, reject), 1500)
        res.resume()
        return
      }
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve(data))
      res.on('error', (err) => {
        if (retries > 0) {
          setTimeout(() => fetchJSON(url, retries - 1).then(resolve, reject), 1000)
        } else {
          reject(err)
        }
      })
    })
    req.on('error', (err) => {
      if (retries > 0) {
        setTimeout(() => fetchJSON(url, retries - 1).then(resolve, reject), 1000)
      } else {
        reject(err)
      }
    })
    req.on('timeout', () => {
      req.destroy()
      if (retries > 0) {
        setTimeout(() => fetchJSON(url, retries - 1).then(resolve, reject), 1000)
      } else {
        reject(new Error('Request timeout'))
      }
    })
  })
}

async function getAlbumArtUrl(artist: string, album: string): Promise<string | null> {
  const cacheKey = `${artist}---${album}`.toLowerCase()
  if (albumArtCache.has(cacheKey)) return albumArtCache.get(cacheKey)!

  try {
    const query = encodeURIComponent(`${artist} ${album}`)
    const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=3`
    const raw = await fetchJSON(url)
    const data = JSON.parse(raw)

    if (data.results && data.results.length > 0) {
      // Get the highest resolution artwork (replace 100x100 with 512x512)
      const artUrl = data.results[0].artworkUrl100?.replace('100x100bb', '512x512bb') || null
      albumArtCache.set(cacheKey, artUrl)
      return artUrl
    }
  } catch (err) {
    console.error('Album art lookup error:', err)
  }

  albumArtCache.set(cacheKey, null)
  return null
}

async function updateDiscordPresence(data: {
  title: string
  artist: string
  album: string
  isPlaying: boolean
  duration: number
  elapsed: number
  format: string
} | null) {
  if (!rpcClient || !rpcReady) return

  try {
    if (!data || !data.isPlaying) {
      await rpcClient.user?.clearActivity()
      return
    }

    // Build display strings based on format
    let details = ''
    let state = ''

    switch (data.format) {
      case 'title-artist':
        details = data.title
        state = `by ${data.artist}`
        break
      case 'artist-title':
        details = data.artist
        state = data.title
        break
      case 'title-album':
        details = data.title
        state = `on ${data.album}`
        break
      case 'full':
        details = `${data.title} by ${data.artist}`
        state = data.album
        break
      case 'minimal':
        details = data.title
        state = ''
        break
      default:
        details = data.title
        state = `by ${data.artist}`
    }

    const now = Date.now()
    const endTimestamp = data.duration > 0
      ? now + (data.duration - data.elapsed) * 1000
      : undefined

    // Look up album cover art URL for Discord to display
    let imageKey = 'aurora_icon'
    let imageText = 'Aurora Player'
    try {
      const artUrl = await getAlbumArtUrl(data.artist, data.album)
      if (artUrl) {
        imageKey = artUrl
        imageText = data.album || 'Aurora Player'
      }
    } catch {}

    const startTimestamp = data.duration > 0
      ? now - data.elapsed * 1000
      : undefined

    const activity: any = {
      type: 2,
      name: `${data.title} by ${data.artist}`,
      details: details.substring(0, 128),
      largeImageKey: imageKey,
      largeImageText: imageText.substring(0, 128),
      instance: false,
    }

    if (state) activity.state = state.substring(0, 128)
    if (data.isPlaying && startTimestamp) activity.startTimestamp = startTimestamp
    if (data.isPlaying && endTimestamp) activity.endTimestamp = endTimestamp

    await rpcClient.user?.setActivity(activity)
  } catch (err) {
    console.error('Discord RPC update error:', err)
  }
}

async function destroyDiscordRPC() {
  if (rpcClient) {
    try {
      await rpcClient.destroy()
    } catch {}
    rpcClient = null
    rpcReady = false
  }
}

// ── Custom protocol for serving local media files ──────────────────────────
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'localfile',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
])

// ── MPRIS / Desktop identity ───────────────────────────────────────────────
// Set proper app identity so MPRIS shows "Aurora Player" instead of "Chromium"
app.setName('Aurora Player')
// Tell Chromium our desktop entry name for proper MPRIS integration on Linux
app.commandLine.appendSwitch('force-app-id', 'aurora-player')
if (process.platform === 'linux') {
  // This is read by Chromium's MPRIS backend to set Identity and DesktopEntry
  app.commandLine.appendSwitch('gtk-application-prefer-dark-theme')
  process.env.BAMF_DESKTOP_FILE_HINT = 'aurora-player.desktop'
}

// ── Globals ────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.flac', '.ogg', '.opus', '.wav', '.m4a', '.aac', '.wma', '.alac',
])

const userDataPath = app.getPath('userData')
const storePath = join(userDataPath, 'library.json')
const coverCachePath = join(userDataPath, 'cover-cache')
const settingsPath = join(userDataPath, 'settings.json')
const playlistsPath = join(userDataPath, 'playlists.json')
const artistCachePath = join(userDataPath, 'artist-cache.json')
const waveformCachePath = join(userDataPath, 'waveform-cache.json')

// ── Artist info disk cache ─────────────────────────────────────────────────
let artistInfoCache: Record<string, { data: any; ts: number }> = {}
const ARTIST_CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

async function loadArtistCache() {
  try {
    if (existsSync(artistCachePath)) {
      artistInfoCache = JSON.parse(await readFile(artistCachePath, 'utf-8'))
    }
  } catch { artistInfoCache = {} }
}

async function saveArtistCache() {
  try {
    await writeFile(artistCachePath, JSON.stringify(artistInfoCache))
  } catch {}
}

// ── Waveform disk cache ────────────────────────────────────────────────────
let waveformDiskCache: Record<string, number[]> = {}

async function loadWaveformCache() {
  try {
    if (existsSync(waveformCachePath)) {
      waveformDiskCache = JSON.parse(await readFile(waveformCachePath, 'utf-8'))
    }
  } catch { waveformDiskCache = {} }
}

let waveformFlushTimer: ReturnType<typeof setTimeout> | null = null
function scheduleWaveformFlush() {
  if (waveformFlushTimer) return
  waveformFlushTimer = setTimeout(async () => {
    waveformFlushTimer = null
    try { await writeFile(waveformCachePath, JSON.stringify(waveformDiskCache)) } catch {}
  }, 5000)
}

// ── In-memory library cache ────────────────────────────────────────────────
// Loaded once at startup, mutated in place, flushed to disk on changes.
// This eliminates repeated disk reads on every IPC call.
interface LibraryCache {
  folders: string[]
  tracks: any[]
  trackMap: Map<string, any>   // path → track for O(1) lookups
  albumMap: Map<string, any>   // albumKey → album object
  artistMap: Map<string, any>  // artistName → artist object
  dirty: boolean
}

const cache: LibraryCache = {
  folders: [],
  tracks: [],
  trackMap: new Map(),
  albumMap: new Map(),
  artistMap: new Map(),
  dirty: false,
}

function rebuildIndexes() {
  cache.trackMap.clear()
  cache.albumMap.clear()
  cache.artistMap.clear()

  for (const track of cache.tracks) {
    // Ensure duration is always a valid number
    if (!track.duration || typeof track.duration !== 'number' || isNaN(track.duration)) {
      track.duration = 0
    }
    cache.trackMap.set(track.path, track)

    // Build album index
    const albumKey = `${track.album}---${track.albumArtist}`
    if (!cache.albumMap.has(albumKey)) {
      cache.albumMap.set(albumKey, {
        id: albumKey.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
        name: track.album,
        artist: track.albumArtist,
        coverArt: track.coverArt,
        year: track.year,
        trackCount: 0,
        totalDuration: 0,
      })
    }
    const album = cache.albumMap.get(albumKey)!
    album.trackCount++
    album.totalDuration += track.duration
    if (!album.coverArt && track.coverArt) album.coverArt = track.coverArt
    if ((!album.year || album.year === 0) && track.year) album.year = track.year

    // Build artist index
    const artistName = track.albumArtist || track.artist || 'Unknown Artist'
    if (!cache.artistMap.has(artistName)) {
      cache.artistMap.set(artistName, {
        name: artistName,
        albumCount: 0,
        trackCount: 0,
      })
    }
    cache.artistMap.get(artistName)!.trackCount++
  }

  // Count albums per artist
  for (const album of Array.from(cache.albumMap.values())) {
    const artist = cache.artistMap.get(album.artist)
    if (artist) artist.albumCount++
  }
}

async function loadCache(): Promise<void> {
  try {
    if (existsSync(storePath)) {
      const data = JSON.parse(await readFile(storePath, 'utf-8'))
      cache.folders = data.folders || []
      cache.tracks = data.tracks || []
    }
  } catch (e) {
    console.error('Failed to load library cache:', e)
    cache.folders = []
    cache.tracks = []
  }
  rebuildIndexes()
  cache.dirty = false
}

let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  cache.dirty = true
  if (flushTimer) return // already scheduled
  flushTimer = setTimeout(async () => {
    flushTimer = null
    if (!cache.dirty) return
    try {
      await writeFile(storePath, JSON.stringify({ folders: cache.folders, tracks: cache.tracks }, null, 2))
      cache.dirty = false
    } catch (e) {
      console.error('Failed to flush library cache:', e)
    }
  }, 2000) // debounce writes to 2 seconds
}

async function forceFlush() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
  if (cache.dirty) {
    await writeFile(storePath, JSON.stringify({ folders: cache.folders, tracks: cache.tracks }, null, 2))
    cache.dirty = false
  }
}

// ── Simple JSON persistence (settings only) ────────────────────────────────
// ── Simple JSON persistence (settings only) ────────────────────────────────
async function loadSettings(): Promise<any> {
  try {
    if (existsSync(settingsPath)) {
      return JSON.parse(await readFile(settingsPath, 'utf-8'))
    }
  } catch {}
  return { volume: 0.8, folders: [] }
}

async function saveSettings(settings: any): Promise<void> {
  await writeFile(settingsPath, JSON.stringify(settings, null, 2))
  scheduleAutoExport()
}

// ── Auto-export / backup ───────────────────────────────────────────────────
const defaultExportPath = join(userDataPath, 'backups')
let autoExportTimer: ReturnType<typeof setTimeout> | null = null

function scheduleAutoExport() {
  if (autoExportTimer) return
  autoExportTimer = setTimeout(async () => {
    autoExportTimer = null
    try {
      const settings = await loadSettings()
      if (settings.autoExport === false) return
      const exportDir = settings.exportPath || defaultExportPath
      await performExport(exportDir, true) // silent auto-export
    } catch {}
  }, 10_000) // debounce 10 seconds
}

async function performExport(exportDir: string, isAuto = false): Promise<string> {
  await mkdir(exportDir, { recursive: true })

  const timestamp = isAuto ? 'latest' : new Date().toISOString().replace(/[:.]/g, '-')
  const exportFile = join(exportDir, `aurora-backup-${timestamp}.json`)

  const settings = await loadSettings()
  const favorites = [...favoriteIds]
  const playlistData = [...playlists]

  const bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    favorites,
    playlists: playlistData,
  }

  await writeFile(exportFile, JSON.stringify(bundle, null, 2))
  return exportFile
}

async function performImport(importPath: string): Promise<{ settings: boolean; favorites: number; playlists: number }> {
  const raw = await readFile(importPath, 'utf-8')
  const bundle = JSON.parse(raw)

  const result = { settings: false, favorites: 0, playlists: 0 }

  if (bundle.settings && typeof bundle.settings === 'object') {
    // Merge — preserve exportPath and autoExport from current settings
    const current = await loadSettings()
    const merged = { ...bundle.settings, exportPath: current.exportPath, autoExport: current.autoExport }
    await writeFile(settingsPath, JSON.stringify(merged, null, 2))
    result.settings = true
  }

  if (Array.isArray(bundle.favorites)) {
    favoriteIds = bundle.favorites
    await writeFile(favoritesPath, JSON.stringify(favoriteIds, null, 2))
    result.favorites = favoriteIds.length
  }

  if (Array.isArray(bundle.playlists)) {
    playlists = bundle.playlists
    await writeFile(playlistsPath, JSON.stringify(playlists, null, 2))
    result.playlists = playlists.length
  }

  return result
}

// ── Favorites persistence ──────────────────────────────────────────────────
const favoritesPath = join(userDataPath, 'favorites.json')
let favoriteIds: string[] = []

async function loadFavorites(): Promise<string[]> {
  try {
    if (existsSync(favoritesPath)) {
      favoriteIds = JSON.parse(await readFile(favoritesPath, 'utf-8'))
    }
  } catch { favoriteIds = [] }
  return favoriteIds
}

async function saveFavorites(): Promise<void> {
  await writeFile(favoritesPath, JSON.stringify(favoriteIds, null, 2))
  scheduleAutoExport()
}

// ── Playlist persistence ───────────────────────────────────────────────────
interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
  updatedAt: number
  smart?: boolean
  rules?: any[]
  ruleMatch?: 'all' | 'any'
}

let playlists: Playlist[] = []

async function loadPlaylists(): Promise<Playlist[]> {
  try {
    if (existsSync(playlistsPath)) {
      playlists = JSON.parse(await readFile(playlistsPath, 'utf-8'))
    }
  } catch {
    playlists = []
  }
  return playlists
}

async function savePlaylists(): Promise<void> {
  await writeFile(playlistsPath, JSON.stringify(playlists, null, 2))
  scheduleAutoExport()
}

// ── Helpers ────────────────────────────────────────────────────────────────
function generateId(str: string): string {
  return createHash('md5').update(str).digest('hex').substring(0, 12)
}

async function ensureCoverCacheDir() {
  if (!existsSync(coverCachePath)) {
    await mkdir(coverCachePath, { recursive: true })
  }
}

// ── Library scanning ───────────────────────────────────────────────────────
async function scanDirectory(dirPath: string): Promise<string[]> {
  const files: string[] = []

  async function walk(dir: string) {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
        } else if (entry.isFile() && AUDIO_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
          files.push(fullPath)
        }
      }
    } catch (err) {
      console.error(`Error scanning ${dir}:`, err)
    }
  }

  await walk(dirPath)
  return files
}

async function parseTrack(filePath: string): Promise<any> {
  try {
    const mm = await import('music-metadata')
    const metadata = await mm.parseFile(filePath)
    const id = generateId(filePath)

    // Extract & cache cover art
    let coverArtPath: string | null = null
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      await ensureCoverCacheDir()
      const pic = metadata.common.picture[0]
      const ext = pic.format === 'image/png' ? 'png' : 'jpg'
      const albumId = generateId(metadata.common.album || filePath)
      const coverFile = `${albumId}.${ext}`
      coverArtPath = join(coverCachePath, coverFile)
      if (!existsSync(coverArtPath)) {
        await writeFile(coverArtPath, pic.data)
      }
    }

    return {
      id,
      path: filePath,
      title: metadata.common.title || basename(filePath, extname(filePath)),
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      albumArtist: metadata.common.albumartist || metadata.common.artist || 'Unknown Artist',
      track: metadata.common.track?.no || 0,
      disc: metadata.common.disk?.no || 1,
      duration: metadata.format.duration && !isNaN(metadata.format.duration) ? Math.round(metadata.format.duration * 1000) / 1000 : 0,
      genre: metadata.common.genre?.[0] || '',
      year: metadata.common.year || 0,
      coverArt: coverArtPath,
      composer: (metadata.common.composer || []).join(', '),
      label: (metadata.common.label || []).join(', '),
      comment: metadata.common.comment ? metadata.common.comment[0] || '' : '',
    }
  } catch (err) {
    console.error(`Error parsing ${filePath}:`, err)
    return {
      id: generateId(filePath),
      path: filePath,
      title: basename(filePath, extname(filePath)),
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      albumArtist: 'Unknown Artist',
      track: 0,
      disc: 1,
      duration: 0,
      genre: '',
      year: 0,
      coverArt: null,
    }
  }
}

// ── Lyrics ─────────────────────────────────────────────────────────────────
async function findLocalLyrics(audioPath: string): Promise<string | null> {
  const dir = dirname(audioPath)
  const name = basename(audioPath, extname(audioPath))
  const lrcPath = join(dir, `${name}.lrc`)

  try {
    if (existsSync(lrcPath)) {
      return await readFile(lrcPath, 'utf-8')
    }
  } catch {}

  return null
}

function lrclibFetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    httpsRequest(url, { headers: { 'User-Agent': 'AuroraPlayer/1.0' } }, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve(data))
      res.on('error', reject)
    }).on('error', reject).end()
  })
}

async function fetchLRCLIB(track: { title: string; artist: string; album: string; duration: number }): Promise<string | null> {
  try {
    // Try exact match first
    const params = new URLSearchParams({
      track_name: track.title,
      artist_name: track.artist,
      album_name: track.album,
      duration: Math.round(track.duration).toString(),
    })
    const exactUrl = `https://lrclib.net/api/get?${params.toString()}`
    const exactRes = await lrclibFetch(exactUrl)
    const exactData = JSON.parse(exactRes)

    if (exactData.syncedLyrics) return exactData.syncedLyrics
    if (exactData.plainLyrics) return exactData.plainLyrics

    // Fallback: search
    const searchParams = new URLSearchParams({
      track_name: track.title,
      artist_name: track.artist,
    })
    const searchUrl = `https://lrclib.net/api/search?${searchParams.toString()}`
    const searchRes = await lrclibFetch(searchUrl)
    const results = JSON.parse(searchRes)

    if (Array.isArray(results) && results.length > 0) {
      // Prefer synced lyrics
      const synced = results.find((r: any) => r.syncedLyrics)
      if (synced) return synced.syncedLyrics
      if (results[0].plainLyrics) return results[0].plainLyrics
    }
  } catch (err) {
    console.error('LRCLIB fetch error:', err)
  }
  return null
}

async function saveLyricsFile(audioPath: string, lrcContent: string): Promise<void> {
  const dir = dirname(audioPath)
  const name = basename(audioPath, extname(audioPath))
  const lrcPath = join(dir, `${name}.lrc`)
  try {
    await writeFile(lrcPath, lrcContent, 'utf-8')
  } catch (err) {
    console.error('Failed to save .lrc file:', err)
  }
}

// ── Last.fm scrobbling helpers ─────────────────────────────────────────────
function md5(str: string): string {
  return createHash('md5').update(str, 'utf-8').digest('hex')
}

function lastfmApiSign(params: Record<string, string>, secret: string): string {
  const keys = Object.keys(params).sort()
  let sig = ''
  for (const k of keys) sig += k + params[k]
  sig += secret
  return md5(sig)
}

function httpPost(url: string, body: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const req = httpsRequest(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body), ...headers },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve(data))
        res.on('error', reject)
      },
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function lastfmScrobble(apiKey: string, apiSecret: string, sessionKey: string, data: { title: string; artist: string; album: string; timestamp: number }) {
  const params: Record<string, string> = {
    method: 'track.scrobble',
    api_key: apiKey,
    sk: sessionKey,
    artist: data.artist,
    track: data.title,
    album: data.album,
    timestamp: String(Math.floor(data.timestamp / 1000)),
  }
  params.api_sig = lastfmApiSign(params, apiSecret)
  params.format = 'json'
  const body = new URLSearchParams(params).toString()
  await httpPost('https://ws.audioscrobbler.com/2.0/', body)
}

async function lastfmUpdateNowPlaying(apiKey: string, apiSecret: string, sessionKey: string, data: { title: string; artist: string; album: string; duration: number }) {
  const params: Record<string, string> = {
    method: 'track.updateNowPlaying',
    api_key: apiKey,
    sk: sessionKey,
    artist: data.artist,
    track: data.title,
    album: data.album,
    duration: String(Math.round(data.duration)),
  }
  params.api_sig = lastfmApiSign(params, apiSecret)
  params.format = 'json'
  const body = new URLSearchParams(params).toString()
  await httpPost('https://ws.audioscrobbler.com/2.0/', body)
}

async function listenbrainzSubmit(token: string, listenType: 'single' | 'playing_now', data: { title: string; artist: string; album: string; duration?: number; timestamp?: number }) {
  const payload: any = {
    listen_type: listenType === 'single' ? 'single' : 'playing_now',
    payload: [
      {
        track_metadata: {
          artist_name: data.artist,
          track_name: data.title,
          release_name: data.album,
          additional_info: {
            duration_ms: data.duration ? Math.round(data.duration * 1000) : undefined,
          },
        },
      },
    ],
  }
  if (listenType === 'single' && data.timestamp) {
    payload.payload[0].listened_at = Math.floor(data.timestamp / 1000)
  }
  const body = JSON.stringify(payload)
  const urlObj = new URL('https://api.listenbrainz.org/1/submit-listens')
  return new Promise<void>((resolve, reject) => {
    const req = httpsRequest(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let d = ''
        res.on('data', (chunk) => (d += chunk))
        res.on('end', () => resolve())
        res.on('error', reject)
      },
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  // Center window on the primary display (fixes Wayland multi-monitor placement)
  const primary = screen.getPrimaryDisplay()
  const { x, y, width: areaW, height: areaH } = primary.workArea
  const winW = 1280
  const winH = 800

  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: Math.round(x + (areaW - winW) / 2),
    y: Math.round(y + (areaH - winH) / 2),
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Initialize custom MPRIS service (Linux only)
  initMpris(mainWindow)
}

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Register localfile:// protocol to serve local files with range-request
  // support so that <audio> seeking works correctly.
  const mimeByExt: Record<string, string> = {
    '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.ogg': 'audio/ogg',
    '.opus': 'audio/opus', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
    '.aac': 'audio/aac', '.wma': 'audio/x-ms-wma', '.alac': 'audio/mp4',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif',
  }

  protocol.handle('localfile', async (request) => {
    try {
      const url = new URL(request.url)
      const filePath = decodeURIComponent(url.pathname)
      if (!filePath || filePath === '/') {
        return new Response('Not found', { status: 404 })
      }

      const fileStat = await stat(filePath)
      const fileSize = fileStat.size
      const ext = extname(filePath).toLowerCase()
      const contentType = mimeByExt[ext] || 'application/octet-stream'

      const rangeHeader = request.headers.get('range')

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
        if (match) {
          const start = parseInt(match[1], 10)
          const end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1
          if (start >= fileSize) {
            return new Response('Range Not Satisfiable', {
              status: 416,
              headers: { 'Content-Range': `bytes */${fileSize}` },
            })
          }
          const chunkSize = end - start + 1
          const nodeStream = createReadStream(filePath, { start, end })
          const body = new ReadableStream({
            start(controller) {
              nodeStream.on('data', (chunk: string | Buffer) => controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : chunk))
              nodeStream.on('end', () => controller.close())
              nodeStream.on('error', (err) => controller.error(err))
            },
            cancel() { nodeStream.destroy() },
          })
          return new Response(body, {
            status: 206,
            headers: {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(chunkSize),
              'Content-Type': contentType,
            },
          })
        }
      }

      // Full-file response — include Content-Length & Accept-Ranges so the
      // browser knows it can seek.
      const nodeStream = createReadStream(filePath)
      const body = new ReadableStream({
        start(controller) {
          nodeStream.on('data', (chunk: string | Buffer) => controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : chunk))
          nodeStream.on('end', () => controller.close())
          nodeStream.on('error', (err) => controller.error(err))
        },
        cancel() { nodeStream.destroy() },
      })
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Length': String(fileSize),
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
        },
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })

  createWindow()

  // Load library into memory cache on startup
  await loadCache()
  await loadArtistCache()
  await loadWaveformCache()
  console.log(`Library cache loaded: ${cache.tracks.length} tracks, ${cache.folders.length} folders`)

  // Initialize Discord Rich Presence
  loadSettings().then((settings) => {
    if (settings.discordRPC !== false) {
      initDiscordRPC(settings.discordClientId)
    }

    // Restore Subsonic config if previously connected
    if (settings.subsonicUrl && settings.subsonicUsername && settings.subsonicPassword) {
      setSubsonicConfig({
        url: settings.subsonicUrl,
        username: settings.subsonicUsername,
        password: settings.subsonicPassword,
        useLegacyAuth: settings.subsonicLegacyAuth === true,
      })
    }
  })

  // ── IPC: Dialogs ──
  ipcMain.handle('dialog:open-folder', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Music Folder',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // ── IPC: Library ──
  ipcMain.handle('library:scan-folder', async (_, folderPath: string) => {
    const audioFiles = await scanDirectory(folderPath)
    const newTracks: any[] = []

    const batchSize = 10
    for (let i = 0; i < audioFiles.length; i += batchSize) {
      const batch = audioFiles.slice(i, i + batchSize)
      const parsed = await Promise.all(batch.map(parseTrack))
      newTracks.push(...parsed)

      if (mainWindow) {
        mainWindow.webContents.send('library:scan-progress', {
          current: Math.min(i + batchSize, audioFiles.length),
          total: audioFiles.length,
        })
      }
    }

    if (!cache.folders.includes(folderPath)) {
      cache.folders.push(folderPath)
    }

    // Merge into cache – replace existing by path
    for (const track of newTracks) {
      cache.trackMap.set(track.path, track)
    }
    cache.tracks = Array.from(cache.trackMap.values())
    rebuildIndexes()
    scheduleFlush()

    return cache.tracks
  })

  ipcMain.handle('library:get-data', async () => {
    return cache.tracks
  })

  ipcMain.handle('library:get-folders', async () => {
    return cache.folders
  })

  ipcMain.handle('library:remove-folder', async (_, folderPath: string) => {
    cache.folders = cache.folders.filter((f: string) => f !== folderPath)
    cache.tracks = cache.tracks.filter((t: any) => !t.path.startsWith(folderPath))
    rebuildIndexes()
    scheduleFlush()
    return { folders: cache.folders, tracks: cache.tracks }
  })

  // ── IPC: Lyrics ──
  ipcMain.handle('lyrics:get', async (_, trackPath: string) => {
    return await findLocalLyrics(trackPath)
  })

  ipcMain.handle('lyrics:fetch-online', async (_, trackInfo: { path: string; title: string; artist: string; album: string; duration: number }) => {
    const online = await fetchLRCLIB(trackInfo)
    if (online && trackInfo.path) {
      // Save the fetched lyrics as .lrc file next to the audio
      await saveLyricsFile(trackInfo.path, online)
    }
    return online
  })

  // ── IPC: Settings ──
  ipcMain.handle('settings:get', async () => await loadSettings())
  ipcMain.handle('settings:set', async (_, settings: any) => await saveSettings(settings))

  // ── IPC: Favorites ──
  ipcMain.handle('favorites:get', async () => await loadFavorites())
  ipcMain.handle('favorites:toggle', async (_, trackId: string) => {
    const idx = favoriteIds.indexOf(trackId)
    if (idx >= 0) {
      favoriteIds.splice(idx, 1)
    } else {
      favoriteIds.push(trackId)
    }
    await saveFavorites()
    return favoriteIds
  })
  ipcMain.handle('favorites:set', async (_, ids: string[]) => {
    favoriteIds = ids
    await saveFavorites()
    return favoriteIds
  })

  // ── IPC: Discord RPC ──
  ipcMain.handle('discord:update-presence', async (_, data) => {
    await updateDiscordPresence(data)
  })

  ipcMain.handle('discord:toggle', async (_, enabled: boolean, clientId?: string) => {
    if (enabled) {
      if (!rpcReady) await initDiscordRPC(clientId)
    } else {
      await updateDiscordPresence(null)
      await destroyDiscordRPC()
    }
  })

  // ── IPC: Playlists ──
  await loadPlaylists()

  ipcMain.handle('playlists:get-all', async () => {
    return playlists
  })

  ipcMain.handle('playlists:get', async (_, id: string) => {
    return playlists.find(p => p.id === id) || null
  })

  ipcMain.handle('playlists:create', async (_, name: string) => {
    const now = Date.now()
    const playlist: Playlist = {
      id: generateId(`playlist-${name}-${now}`),
      name,
      trackIds: [],
      createdAt: now,
      updatedAt: now,
    }
    playlists.push(playlist)
    await savePlaylists()
    return playlist
  })

  ipcMain.handle('playlists:delete', async (_, id: string) => {
    playlists = playlists.filter(p => p.id !== id)
    await savePlaylists()
    return playlists
  })

  ipcMain.handle('playlists:rename', async (_, id: string, name: string) => {
    const pl = playlists.find(p => p.id === id)
    if (pl) {
      pl.name = name
      pl.updatedAt = Date.now()
      await savePlaylists()
    }
    return pl || null
  })

  ipcMain.handle('playlists:add-tracks', async (_, id: string, trackIds: string[]) => {
    const pl = playlists.find(p => p.id === id)
    if (pl) {
      for (const tid of trackIds) {
        if (!pl.trackIds.includes(tid)) pl.trackIds.push(tid)
      }
      pl.updatedAt = Date.now()
      await savePlaylists()
    }
    return pl || null
  })

  ipcMain.handle('playlists:remove-track', async (_, id: string, trackId: string) => {
    const pl = playlists.find(p => p.id === id)
    if (pl) {
      pl.trackIds = pl.trackIds.filter(t => t !== trackId)
      pl.updatedAt = Date.now()
      await savePlaylists()
    }
    return pl || null
  })

  // ── IPC: Window controls ──
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => mainWindow?.close())
  ipcMain.on('window:enter-fullscreen', () => {
    if (!mainWindow) return
    mainWindow.setFullScreen(true)
  })
  ipcMain.on('window:exit-fullscreen', () => {
    if (!mainWindow) return
    mainWindow.setFullScreen(false)
  })

  // ── IPC: MPRIS updates (renderer → main → D-Bus) ──
  ipcMain.on('mpris:metadata', (_, data) => updateMprisMetadata(data))
  ipcMain.on('mpris:playback-status', (_, status) => updateMprisPlaybackStatus(status))
  ipcMain.on('mpris:position', (_, seconds) => updateMprisPosition(seconds))
  ipcMain.on('mpris:volume', (_, vol) => updateMprisVolume(vol))
  ipcMain.on('mpris:loop-status', (_, mode) => updateMprisLoopStatus(mode))
  ipcMain.on('mpris:shuffle', (_, enabled) => updateMprisShuffle(enabled))
  ipcMain.on('mpris:seeked', (_, seconds) => emitMprisSeeked(seconds))
  ipcMain.handle('mpris:cover-path', (_, coverArt: string) => {
    // Return a file:// URL for the cover art path (used for MPRIS artwork)
    if (!coverArt) return ''
    return `file://${coverArt}`
  })

  // ── IPC: Track credits / extended metadata ──
  ipcMain.handle('track:get-credits', async (_, trackPath: string) => {
    try {
      const mm = await import('music-metadata')
      const metadata = await mm.parseFile(trackPath)
      const c = metadata.common
      const f = metadata.format
      return {
        composer: c.composer || [],
        lyricist: c.lyricist || [],
        conductor: c.conductor || [],
        producer: (c as any).producer || [],
        engineer: (c as any).engineer || [],
        mixer: (c as any).mixer || [],
        remixer: (c as any).remixer || [],
        writer: (c as any).writer || [],
        label: c.label || [],
        copyright: c.copyright || '',
        encodedBy: c.encodedby || '',
        comment: c.comment ? c.comment[0] || '' : '',
        bpm: c.bpm || null,
        bitrate: f.bitrate ? Math.round(f.bitrate / 1000) : null,
        sampleRate: f.sampleRate || null,
        codec: f.codec || '',
        lossless: f.lossless || false,
      }
    } catch (err) {
      console.error('Failed to read track credits:', err)
      return {
        composer: [], lyricist: [], conductor: [], producer: [],
        engineer: [], mixer: [], remixer: [], writer: [], label: [],
        copyright: '', encodedBy: '', comment: '',
        bpm: null, bitrate: null, sampleRate: null, codec: '', lossless: false,
      }
    }
  })

  // ── IPC: Waveform generation (runs in main process to avoid renderer OOM) ──
  ipcMain.handle('track:generate-waveform', async (_, trackPath: string) => {
    // Check disk cache first
    const cacheKey = generateId(trackPath)
    if (waveformDiskCache[cacheKey]) {
      return waveformDiskCache[cacheKey]
    }

    let result: number[] = []
    try {
      const mm = await import('music-metadata')
      const fstat = await stat(trackPath)
      const fileSize = fstat.size
      const BARS = 200
      const MAX_MEMORY = 50 * 1024 * 1024

      const metadata = await mm.parseFile(trackPath, { duration: true })
      const sampleRate = metadata.format.sampleRate || 44100
      const channels = metadata.format.numberOfChannels || 2
      const bitsPerSample = metadata.format.bitsPerSample || 16
      const bytesPerSample = bitsPerSample / 8
      const duration = metadata.format.duration || 0

      if (duration === 0) return []

      const ext = extname(trackPath).toLowerCase()
      const isPCM = ['.wav', '.aif', '.aiff'].includes(ext)

      if (isPCM && fileSize <= MAX_MEMORY * 2) {
        const buffer = await readFile(trackPath)
        const headerSize = ext === '.wav' ? 44 : 0
        const dataLen = buffer.length - headerSize
        const totalSamples = Math.floor(dataLen / (bytesPerSample * channels))
        const samplesPerBar = Math.floor(totalSamples / BARS)
        const peaks: number[] = []
        for (let bar = 0; bar < BARS; bar++) {
          let sum = 0
          const startSample = bar * samplesPerBar
          const step = Math.max(1, Math.floor(samplesPerBar / 100))
          let count = 0
          for (let s = startSample; s < startSample + samplesPerBar && s < totalSamples; s += step) {
            const byteOffset = headerSize + s * bytesPerSample * channels
            if (byteOffset + bytesPerSample > buffer.length) break
            let value: number
            if (bytesPerSample === 2) { value = Math.abs(buffer.readInt16LE(byteOffset)) / 32768 }
            else if (bytesPerSample === 3) {
              value = buffer[byteOffset] | (buffer[byteOffset + 1] << 8) | (buffer[byteOffset + 2] << 16)
              if (value > 0x7FFFFF) value -= 0x1000000
              value = Math.abs(value) / 8388608
            } else { value = Math.abs(buffer.readInt8(byteOffset)) / 128 }
            sum += value; count++
          }
          peaks.push(count > 0 ? sum / count : 0)
        }
        const max = Math.max(...peaks, 0.001)
        result = peaks.map(p => p / max)
      } else {
        // Try ffmpeg for compressed formats
        try {
          const { execFile } = await import('child_process')
          const { promisify } = await import('util')
          const execFileAsync = promisify(execFile)
          const targetSampleRate = Math.min(8000, sampleRate)
          const ffResult = await execFileAsync('ffmpeg', [
            '-i', trackPath, '-ac', '1', '-ar', String(targetSampleRate),
            '-f', 's16le', '-v', 'quiet', 'pipe:1'
          ], { maxBuffer: targetSampleRate * 2 * Math.ceil(duration) + 1024, encoding: 'buffer' as any })
          const pcmBuffer = ffResult.stdout as unknown as Buffer
          const totalSamples = Math.floor(pcmBuffer.length / 2)
          const samplesPerBar = Math.floor(totalSamples / BARS)
          const peaks: number[] = []
          for (let bar = 0; bar < BARS; bar++) {
            let sum = 0, count = 0
            const startSample = bar * samplesPerBar
            for (let s = startSample; s < startSample + samplesPerBar && s < totalSamples; s++) {
              sum += Math.abs(pcmBuffer.readInt16LE(s * 2)) / 32768; count++
            }
            peaks.push(count > 0 ? sum / count : 0)
          }
          const max = Math.max(...peaks, 0.001)
          result = peaks.map(p => p / max)
        } catch {
          // ffmpeg not available — generate approximate waveform from file bytes
          const CHUNK_SIZE = 4096
          const chunkSpacing = Math.floor(fileSize / BARS)
          const peaks: number[] = []
          const { open, close, read: fsRead } = await import('fs')
          const { promisify } = await import('util')
          const openAsync = promisify(open)
          const readAsync = promisify(fsRead)
          const closeAsync = promisify(close)
          const fd = await openAsync(trackPath, 'r')
          try {
            for (let i = 0; i < BARS; i++) {
              const pos = Math.min(i * chunkSpacing, fileSize - CHUNK_SIZE)
              const buf = Buffer.alloc(CHUNK_SIZE)
              const { bytesRead } = await readAsync(fd, buf, 0, CHUNK_SIZE, pos)
              let sum = 0
              for (let j = 0; j < bytesRead; j += 2) {
                if (j + 1 < bytesRead) sum += Math.abs(buf.readInt16LE(j))
              }
              peaks.push(sum / (bytesRead / 2))
            }
          } finally { await closeAsync(fd) }
          const max = Math.max(...peaks, 0.001)
          result = peaks.map(p => p / max)
        }
      }
    } catch (err) {
      console.error('Waveform generation error:', err)
      return []
    }

    // Save to disk cache
    if (result.length > 0) {
      waveformDiskCache[cacheKey] = result
      scheduleWaveformFlush()
    }
    return result
  })

  // ── IPC: Artist info (MusicBrainz + Wikipedia summary) ──
  ipcMain.handle('artist:get-info', async (_, artistName: string) => {
    // Check disk cache first (7-day TTL)
    const cached = artistInfoCache[artistName]
    if (cached && Date.now() - cached.ts < 7 * 24 * 60 * 60 * 1000) {
      return cached.data
    }

    try {
      const query = encodeURIComponent(artistName)
      const mbUrl = `https://musicbrainz.org/ws/2/artist/?query=artist:${query}&fmt=json&limit=1`
      const mbRaw = await fetchJSON(mbUrl)
      const mbData = JSON.parse(mbRaw)

      if (!mbData.artists || mbData.artists.length === 0) return null

      const artist = mbData.artists[0]
      const info: any = {
        name: artist.name || artistName,
        disambiguation: artist.disambiguation || '',
        type: artist.type || '',
        country: artist.country || artist.area?.name || '',
        beginDate: artist['life-span']?.begin || '',
        endDate: artist['life-span']?.end || '',
        tags: (artist.tags || []).slice(0, 10).map((t: any) => t.name),
        bio: '',
        imageUrl: null,
      }

      // Helper to fetch Wikipedia summary + thumbnail for a given page title/lang
      const fetchWikiSummary = async (pageTitle: string, lang = 'en') => {
        const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`
        const summaryRaw = await fetchJSON(summaryUrl)
        const summaryData = JSON.parse(summaryRaw)
        if (summaryData.extract) info.bio = summaryData.extract
        if (summaryData.thumbnail?.source) info.imageUrl = summaryData.thumbnail.source
        // Get higher res image if available
        if (summaryData.originalimage?.source && !info.imageUrl) {
          info.imageUrl = summaryData.originalimage.source
        }
      }

      // Try to fetch Wikipedia summary for bio using MusicBrainz relations
      if (artist.id) {
        try {
          // Rate limit: MusicBrainz requires max 1 req/sec
          await new Promise(r => setTimeout(r, 1200))
          const relUrl = `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=url-rels&fmt=json`
          const relRaw = await fetchJSON(relUrl)
          const relData = JSON.parse(relRaw)
          const relations = relData.relations || []

          // Try Wikipedia link first
          const wikiRel = relations.find((r: any) => r.type === 'wikipedia')
          if (wikiRel?.url?.resource) {
            const wikiUrl = wikiRel.url.resource
            const match = wikiUrl.match(/\/\/(\w+)\.wikipedia\.org\/wiki\/(.+)$/)
            if (match) {
              const lang = match[1]
              const pageTitle = decodeURIComponent(match[2])
              await fetchWikiSummary(pageTitle, lang)
            }
          }

          // If no bio yet, try Wikidata → find English Wikipedia page
          if (!info.bio) {
            const wikidataRel = relations.find((r: any) => r.type === 'wikidata')
            if (wikidataRel?.url?.resource) {
              const wdMatch = wikidataRel.url.resource.match(/wikidata\.org\/wiki\/(Q\d+)/)
              if (wdMatch) {
                try {
                  const wdUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wdMatch[1]}&props=sitelinks&format=json`
                  const wdRaw = await fetchJSON(wdUrl)
                  const wdData = JSON.parse(wdRaw)
                  const entity = wdData.entities?.[wdMatch[1]]
                  const enWikiTitle = entity?.sitelinks?.enwiki?.title
                  if (enWikiTitle) {
                    await fetchWikiSummary(enWikiTitle, 'en')
                  }
                } catch { /* wikidata fallback failed */ }
              }
            }
          }

          // Look for an image from MusicBrainz image relation
          if (!info.imageUrl) {
            const imgRel = relations.find((r: any) => r.type === 'image')
            if (imgRel?.url?.resource) {
              // Commons image URL — convert to thumbnail
              const commonsMatch = imgRel.url.resource.match(/commons\.wikimedia\.org\/wiki\/File:(.+)/)
              if (commonsMatch) {
                const filename = decodeURIComponent(commonsMatch[1])
                info.imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=400`
              }
            }
          }
        } catch (wikiErr) {
          console.error('Wikipedia fetch error:', wikiErr)
        }
      }

      // Final fallback: try direct Wikipedia search if still no bio
      if (!info.bio) {
        try {
          const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artistName)}`
          const searchRaw = await fetchJSON(searchUrl)
          const searchData = JSON.parse(searchRaw)
          if (searchData.extract && searchData.type !== 'disambiguation') {
            info.bio = searchData.extract
            if (!info.imageUrl && searchData.thumbnail?.source) {
              info.imageUrl = searchData.thumbnail.source
            }
          }
        } catch { /* direct search failed */ }
      }

      // Cache and return
      artistInfoCache[artistName] = { data: info, ts: Date.now() }
      saveArtistCache()
      return info
    } catch (err) {
      console.error('Artist info fetch error:', err)
      return null
    }
  })

  // ── IPC: Show in file explorer ──
  ipcMain.handle('shell:show-in-explorer', async (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('shell:open-path', async (_, dirPath: string) => {
    await shell.openPath(dirPath)
  })

  // ── IPC: Subsonic / Navidrome ──
  ipcMain.handle('subsonic:test', async (_, cfg: { url: string; username: string; password: string; useLegacyAuth: boolean }) => {
    setSubsonicConfig(cfg)
    return await subsonicPing()
  })

  ipcMain.handle('subsonic:fetch-library', async () => {
    return await subsonicGetAllSongs()
  })

  ipcMain.handle('subsonic:stream-url', async (_, songId: string) => {
    return getStreamUrl(songId)
  })

  ipcMain.handle('subsonic:cover-url', async (_, coverArtId: string) => {
    return getCoverArtUrl(coverArtId)
  })

  // ── IPC: Save lyrics ──
  ipcMain.handle('lyrics:save', async (_, trackPath: string, lrcContent: string) => {
    await saveLyricsFile(trackPath, lrcContent)
  })

  // ── IPC: Export / Import ──
  ipcMain.handle('export:run', async (_, customPath?: string) => {
    const settings = await loadSettings()
    const exportDir = customPath || settings.exportPath || defaultExportPath
    const filePath = await performExport(exportDir, false)
    return filePath
  })

  ipcMain.handle('export:import', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Aurora Backup',
      filters: [{ name: 'Aurora Backup', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return await performImport(result.filePaths[0])
  })

  ipcMain.handle('export:choose-dir', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose Export Folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('export:get-default-path', async () => {
    return defaultExportPath
  })

  // ── IPC: Reset caches ──
  ipcMain.handle('cache:reset', async (_, targets: string[]) => {
    const results: Record<string, boolean> = {}

    if (targets.includes('library')) {
      try {
        cache.tracks = []
        cache.trackMap.clear()
        cache.folders = []
        if (existsSync(storePath)) await rm(storePath)
        results.library = true
      } catch { results.library = false }
    }

    if (targets.includes('covers')) {
      try {
        if (existsSync(coverCachePath)) {
          await rm(coverCachePath, { recursive: true })
          await mkdir(coverCachePath, { recursive: true })
        }
        results.covers = true
      } catch { results.covers = false }
    }

    if (targets.includes('artist')) {
      try {
        artistInfoCache = {}
        if (existsSync(artistCachePath)) await rm(artistCachePath)
        results.artist = true
      } catch { results.artist = false }
    }

    if (targets.includes('waveform')) {
      try {
        waveformDiskCache = {}
        if (existsSync(waveformCachePath)) await rm(waveformCachePath)
        results.waveform = true
      } catch { results.waveform = false }
    }

    return results
  })

  // ── IPC: Folder tree ──
  ipcMain.handle('folder:get-tree', async (_, folderPath: string) => {
    async function buildTree(dir: string, depth = 0): Promise<any[]> {
      if (depth > 10) return [] // prevent infinite recursion
      try {
        const entries = await readdir(dir, { withFileTypes: true })
        const result: any[] = []
        for (const entry of entries.sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1
          if (!a.isDirectory() && b.isDirectory()) return 1
          return a.name.localeCompare(b.name)
        })) {
          const fullPath = join(dir, entry.name)
          if (entry.isDirectory()) {
            const children = await buildTree(fullPath, depth + 1)
            const trackCount = children.reduce(
              (sum, c) => sum + (c.isDirectory ? (c.trackCount || 0) : (AUDIO_EXTENSIONS.has(extname(c.name).toLowerCase()) ? 1 : 0)),
              0
            )
            result.push({
              name: entry.name, path: fullPath, isDirectory: true,
              children, trackCount,
            })
          } else if (AUDIO_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
            result.push({ name: entry.name, path: fullPath, isDirectory: false })
          }
        }
        return result
      } catch {
        return []
      }
    }
    return buildTree(folderPath)
  })

  // ── IPC: Scrobbling (Last.fm + ListenBrainz) ──
  ipcMain.handle('scrobble:track', async (_, data: { title: string; artist: string; album: string; duration: number; timestamp: number }) => {
    const settings = await loadSettings()

    // Last.fm scrobble
    if (settings.lastfmSessionKey && settings.lastfmApiKey) {
      try {
        await lastfmScrobble(settings.lastfmApiKey, settings.lastfmApiSecret, settings.lastfmSessionKey, data)
      } catch (err) {
        console.error('Last.fm scrobble error:', err)
      }
    }

    // ListenBrainz scrobble
    if (settings.listenbrainzToken) {
      try {
        await listenbrainzSubmit(settings.listenbrainzToken, 'single', data)
      } catch (err) {
        console.error('ListenBrainz scrobble error:', err)
      }
    }

    return true
  })

  ipcMain.handle('scrobble:now-playing', async (_, data: { title: string; artist: string; album: string; duration: number }) => {
    const settings = await loadSettings()

    if (settings.lastfmSessionKey && settings.lastfmApiKey) {
      try {
        await lastfmUpdateNowPlaying(settings.lastfmApiKey, settings.lastfmApiSecret, settings.lastfmSessionKey, data)
      } catch (err) {
        console.error('Last.fm now-playing error:', err)
      }
    }

    if (settings.listenbrainzToken) {
      try {
        await listenbrainzSubmit(settings.listenbrainzToken, 'playing_now', data)
      } catch (err) {
        console.error('ListenBrainz now-playing error:', err)
      }
    }

    return true
  })

  // ── IPC: Smart playlists ──
  ipcMain.handle('playlists:create-smart', async (_, name: string, rules: any[], ruleMatch: string) => {
    const now = Date.now()
    const playlist: Playlist = {
      id: generateId(`smart-${name}-${now}`),
      name,
      trackIds: [],
      createdAt: now,
      updatedAt: now,
      smart: true,
      rules,
      ruleMatch: ruleMatch as 'all' | 'any',
    }
    playlists.push(playlist)
    await savePlaylists()
    return playlist
  })

  ipcMain.handle('playlists:update-smart', async (_, id: string, rules: any[], ruleMatch: string) => {
    const pl = playlists.find(p => p.id === id)
    if (pl && pl.smart) {
      pl.rules = rules
      pl.ruleMatch = ruleMatch as 'all' | 'any'
      pl.updatedAt = Date.now()
      await savePlaylists()
    }
    return pl || null
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await forceFlush()
  destroyDiscordRPC()
  destroyMpris()
  app.quit()
})
