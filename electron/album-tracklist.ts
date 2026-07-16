/**
 * Canonical album tracklist fetcher — powers the optional "missing tracks"
 * feature on album pages.
 *
 * Uses the public iTunes Search/Lookup API (keyless, same service already used
 * for Discord artwork) to fetch the full official tracklist of an album.  The
 * renderer compares it against the local library and greys out tracks that are
 * missing.  Results are cached on disk since official tracklists rarely change.
 */

import { ipcMain } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { logger } from './logger'
import { getAppPaths } from './paths'
import { fetchText, normalizeStr } from './animated-covers'

export interface CanonicalTrack {
  title: string
  track: number
  disc: number
  duration: number // seconds, 0 if unknown
}

// ── Config ──────────────────────────────────────────────────────────────────
const TRACKLIST_CACHE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days — tracklists are static
const NEGATIVE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000   // 7 days — album not found
const NETWORK_ERROR_CACHE_TTL = 30 * 60 * 1000       // 30 min — transient network errors

// ── State ───────────────────────────────────────────────────────────────────
let cachePath = ''
let negativeCachePath = ''
let tracklistCache: Record<string, { tracks: CanonicalTrack[]; ts: number }> = {}
let negativeLookups: Record<string, number> = {} // key → timestamp (negative = network error)

// ── Cache helpers (same pattern as animated-covers) ─────────────────────────
function albumKey(album: string, artist: string): string {
  const raw = `${album.trim().toLowerCase()}---${artist.trim().toLowerCase()}`
  return createHash('sha256').update(raw).digest('hex').substring(0, 24)
}

function loadCache() {
  try {
    if (existsSync(cachePath)) {
      tracklistCache = JSON.parse(readFileSync(cachePath, 'utf-8'))
    }
  } catch { tracklistCache = {} }
  try {
    if (existsSync(negativeCachePath)) {
      negativeLookups = JSON.parse(readFileSync(negativeCachePath, 'utf-8'))
    }
  } catch { negativeLookups = {} }
}

function saveCache() {
  try { writeFileSync(cachePath, JSON.stringify(tracklistCache)) } catch {}
}

function saveNegativeCache() {
  try { writeFileSync(negativeCachePath, JSON.stringify(negativeLookups)) } catch {}
}

function isNegativelyCached(key: string): boolean {
  const ts = negativeLookups[key]
  if (ts === undefined) return false
  const ttl = ts < 0 ? NETWORK_ERROR_CACHE_TTL : NEGATIVE_CACHE_TTL
  if (Date.now() - Math.abs(ts) > ttl) {
    delete negativeLookups[key]
    return false
  }
  return true
}

// ── iTunes album matching ───────────────────────────────────────────────────
interface ITunesCollection {
  collectionId: number
  collectionName: string
  artistName: string
  trackCount?: number
}

function findCollectionId(results: ITunesCollection[], normAlbum: string, normArtist: string, artistParts: string[]): number | null {
  function artistMatch(rArtist: string): boolean {
    return rArtist === normArtist
      || rArtist.includes(normArtist)
      || normArtist.includes(rArtist)
      || artistParts.some(p => p.length > 2 && (rArtist.includes(p) || p.includes(rArtist)))
  }

  // Pass 1: exact album name — avoids picking deluxe/anniversary editions over the original
  for (const r of results) {
    if (normalizeStr(r.collectionName ?? '') !== normAlbum) continue
    if (!artistMatch(normalizeStr(r.artistName ?? ''))) continue
    return r.collectionId
  }

  // Pass 2: contains match — handles remaster tags, subtitles, etc.
  // Same word-ratio guard as animated covers: prevents "SOS" matching "SOS Deluxe: LANA"
  for (const r of results) {
    const rName = normalizeStr(r.collectionName ?? '')
    const rWords = rName.split(' ').length
    const normWords = normAlbum.split(' ').length
    const nameMatch = rName.includes(normAlbum)
      || (normAlbum.includes(rName) && rWords / normWords >= 0.4)
    if (!nameMatch) continue
    if (!artistMatch(normalizeStr(r.artistName ?? ''))) continue
    return r.collectionId
  }

  return null
}

async function fetchTracklistFromITunes(album: string, artist: string): Promise<CanonicalTrack[] | null> {
  const normAlbum = normalizeStr(album)
  const normArtist = normalizeStr(artist)
  const artistParts = normArtist
    .split(/[,;&]|\bfeat\.?\b|\bft\.?\b|\bwith\b/i)
    .map(s => s.trim()).filter(Boolean)

  let collectionId: number | null = null
  for (const term of [`${album} ${artist}`, album]) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=25&media=music`
    const raw = await fetchText(url)
    const results: ITunesCollection[] = JSON.parse(raw)?.results ?? []
    collectionId = findCollectionId(results, normAlbum, normArtist, artistParts)
    if (collectionId) break
  }
  if (!collectionId) return null

  // Lookup the full tracklist for the matched album
  const lookupUrl = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song&limit=200`
  const raw = await fetchText(lookupUrl)
  const entries: any[] = JSON.parse(raw)?.results ?? []
  const tracks: CanonicalTrack[] = entries
    .filter(e => e.wrapperType === 'track' && e.kind === 'song')
    .map(e => ({
      title: String(e.trackName ?? ''),
      track: Number(e.trackNumber) || 0,
      disc: Number(e.discNumber) || 1,
      duration: e.trackTimeMillis ? Math.round(e.trackTimeMillis / 1000) : 0,
    }))
    .filter(t => t.title)
    .sort((a, b) => (a.disc !== b.disc ? a.disc - b.disc : a.track - b.track))

  return tracks.length > 0 ? tracks : null
}

// ── Public API ──────────────────────────────────────────────────────────────
async function getAlbumTracklist(album: string, artist: string): Promise<CanonicalTrack[] | null> {
  if (!album.trim()) return null
  const key = albumKey(album, artist)

  const entry = tracklistCache[key]
  if (entry && Date.now() - entry.ts < TRACKLIST_CACHE_TTL) {
    return entry.tracks
  }

  if (isNegativelyCached(key)) return null

  try {
    const tracks = await fetchTracklistFromITunes(album, artist)
    if (!tracks) {
      negativeLookups[key] = Date.now()
      saveNegativeCache()
      return null
    }
    tracklistCache[key] = { tracks, ts: Date.now() }
    saveCache()
    return tracks
  } catch (err) {
    logger.warn(`Album tracklist lookup failed for "${album}" by "${artist}": ${err}`)
    // Transient error: negative timestamp = short TTL, so an outage doesn't block for 7 days
    negativeLookups[key] = -Date.now()
    saveNegativeCache()
    return null
  }
}

export function clearTracklistCache() {
  tracklistCache = {}
  saveCache()
  negativeLookups = {}
  saveNegativeCache()
}

// ── IPC Registration ────────────────────────────────────────────────────────
export function registerAlbumTracklistIPC() {
  const cacheDir = getAppPaths().cache
  cachePath = join(cacheDir, 'album-tracklist-cache.json')
  negativeCachePath = join(cacheDir, 'album-tracklist-negative.json')
  loadCache()

  ipcMain.handle('album-tracklist:get', async (_, album: string, artist: string) => {
    return getAlbumTracklist(album, artist)
  })

  // Batch cache-only lookup for the Albums view filter — never hits the network.
  // Per album id: tracks = cached tracklist, null = known no-data (negative cache),
  // absent = never looked up.
  ipcMain.handle('album-tracklist:get-cached', (_, albums: { id: string; album: string; artist: string }[]) => {
    const out: Record<string, CanonicalTrack[] | null> = {}
    for (const a of albums) {
      const key = albumKey(a.album, a.artist)
      const entry = tracklistCache[key]
      if (entry && Date.now() - entry.ts < TRACKLIST_CACHE_TTL) out[a.id] = entry.tracks
      else if (isNegativelyCached(key)) out[a.id] = null
    }
    return out
  })
}
