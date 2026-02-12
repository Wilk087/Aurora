// ── Subsonic/Navidrome API client ─────────────────────────────────────────
import { createHash } from 'crypto'

interface SubsonicConfig {
  url: string        // e.g. https://navidrome.example.com
  username: string
  password: string   // stored as plaintext in settings (or token)
  useLegacyAuth: boolean
}

interface SubsonicResponse {
  'subsonic-response': {
    status: 'ok' | 'failed'
    version: string
    error?: { code: number; message: string }
    [key: string]: any
  }
}

let config: SubsonicConfig | null = null

export function setSubsonicConfig(cfg: SubsonicConfig | null) {
  config = cfg
}

export function getSubsonicConfig(): SubsonicConfig | null {
  return config
}

function buildAuthParams(): URLSearchParams {
  if (!config) throw new Error('Subsonic not configured')
  const params = new URLSearchParams()
  params.set('u', config.username)
  params.set('v', '1.16.1')
  params.set('c', 'AuroraPlayer')
  params.set('f', 'json')

  if (config.useLegacyAuth) {
    // Legacy: send password as hex-encoded (enc:hex)
    params.set('p', `enc:${Buffer.from(config.password).toString('hex')}`)
  } else {
    // Modern: salt + token
    const salt = createHash('md5').update(Date.now().toString()).digest('hex').substring(0, 8)
    const token = createHash('md5').update(config.password + salt).digest('hex')
    params.set('t', token)
    params.set('s', salt)
  }

  return params
}

function buildUrl(endpoint: string, extra?: Record<string, string>): string {
  if (!config) throw new Error('Subsonic not configured')
  const base = config.url.replace(/\/+$/, '')
  const params = buildAuthParams()
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, v)
  }
  return `${base}/rest/${endpoint}?${params.toString()}`
}

async function apiRequest(endpoint: string, extra?: Record<string, string>): Promise<any> {
  const url = buildUrl(endpoint, extra)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Subsonic API error: ${response.status} ${response.statusText}`)
  const data: SubsonicResponse = await response.json()
  const sr = data['subsonic-response']
  if (sr.status === 'failed') {
    throw new Error(`Subsonic: ${sr.error?.message || 'Unknown error'} (code ${sr.error?.code})`)
  }
  return sr
}

/** Test connection / ping */
export async function subsonicPing(): Promise<boolean> {
  try {
    const res = await apiRequest('ping')
    return res.status === 'ok'
  } catch {
    return false
  }
}

/** Get all artists */
export async function subsonicGetArtists(): Promise<any[]> {
  const res = await apiRequest('getArtists')
  const idx = res.artists?.index || []
  const artists: any[] = []
  for (const group of idx) {
    if (group.artist) {
      for (const a of Array.isArray(group.artist) ? group.artist : [group.artist]) {
        artists.push(a)
      }
    }
  }
  return artists
}

/** Get artist detail with albums */
export async function subsonicGetArtist(id: string): Promise<any> {
  const res = await apiRequest('getArtist', { id })
  return res.artist
}

/** Get album detail with songs */
export async function subsonicGetAlbum(id: string): Promise<any> {
  const res = await apiRequest('getAlbum', { id })
  return res.album
}

/** Get all albums (by newest, alphabetical, etc.) */
export async function subsonicGetAlbumList(type: string = 'alphabeticalByName', size: number = 500, offset: number = 0): Promise<any[]> {
  const res = await apiRequest('getAlbumList2', {
    type,
    size: size.toString(),
    offset: offset.toString(),
  })
  return res.albumList2?.album || []
}

/** Fetch all albums (paginated) */
export async function subsonicGetAllAlbums(): Promise<any[]> {
  const allAlbums: any[] = []
  let offset = 0
  const pageSize = 500
  while (true) {
    const batch = await subsonicGetAlbumList('alphabeticalByName', pageSize, offset)
    allAlbums.push(...batch)
    if (batch.length < pageSize) break
    offset += pageSize
  }
  return allAlbums
}

/** Search */
export async function subsonicSearch(query: string): Promise<{ artists: any[]; albums: any[]; songs: any[] }> {
  const res = await apiRequest('search3', {
    query,
    artistCount: '20',
    albumCount: '20',
    songCount: '50',
  })
  return {
    artists: res.searchResult3?.artist || [],
    albums: res.searchResult3?.album || [],
    songs: res.searchResult3?.song || [],
  }
}

/** Convert a Subsonic song to our Track interface */
export function subsonicSongToTrack(song: any): any {
  return {
    id: `subsonic-${song.id}`,
    path: `subsonic://${song.id}`,
    title: song.title || 'Unknown Title',
    artist: song.artist || 'Unknown Artist',
    album: song.album || 'Unknown Album',
    albumArtist: song.albumArtist || song.artist || 'Unknown Artist',
    track: song.track || 0,
    disc: song.discNumber || 1,
    duration: song.duration || 0,
    genre: song.genre || '',
    year: song.year || 0,
    coverArt: song.coverArt ? getCoverArtUrl(song.coverArt) : null,
    source: 'subsonic',
  }
}

/** Get the streaming URL for a song */
export function getStreamUrl(songId: string): string {
  const params = buildAuthParams()
  const base = config!.url.replace(/\/+$/, '')
  return `${base}/rest/stream?id=${songId}&${params.toString()}`
}

/** Get cover art URL */
export function getCoverArtUrl(coverArtId: string, size: number = 512): string {
  const params = buildAuthParams()
  params.set('id', coverArtId)
  params.set('size', size.toString())
  const base = config!.url.replace(/\/+$/, '')
  return `${base}/rest/getCoverArt?${params.toString()}`
}

/** Fetch all songs from the server (via albums) */
export async function subsonicGetAllSongs(): Promise<any[]> {
  const albums = await subsonicGetAllAlbums()
  const tracks: any[] = []

  for (const album of albums) {
    try {
      const detail = await subsonicGetAlbum(album.id)
      const songs = detail?.song || []
      for (const song of Array.isArray(songs) ? songs : [songs]) {
        tracks.push(subsonicSongToTrack(song))
      }
    } catch (err) {
      console.error(`Failed to fetch album ${album.id}:`, err)
    }
  }

  return tracks
}
