import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, extname, basename, dirname } from 'path'
import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises'
import { existsSync, createReadStream } from 'fs'
import { createHash } from 'crypto'
import { request as httpsRequest, get as httpsGet } from 'https'

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

function fetchJSON(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    httpsGet(url, { headers: { 'User-Agent': 'AuroraPlayer/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve, reject)
      }
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve(data))
      res.on('error', reject)
    }).on('error', reject)
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
}

// ── Playlist persistence ───────────────────────────────────────────────────
interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
  updatedAt: number
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

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
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
              nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
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
          nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
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
  console.log(`Library cache loaded: ${cache.tracks.length} tracks, ${cache.folders.length} folders`)

  // Initialize Discord Rich Presence
  loadSettings().then((settings) => {
    if (settings.discordRPC !== false) {
      initDiscordRPC(settings.discordClientId)
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await forceFlush()
  destroyDiscordRPC()
  app.quit()
})
