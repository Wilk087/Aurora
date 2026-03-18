/**
 * Animated Album Cover fetcher
 *
 * Uses the Apple Music catalog API to find "editorialVideo" (motion artwork)
 * for albums.  The public bearer token is extracted from Apple Music's web
 * player JS bundle — the same technique open-source clients like Cider use.
 *
 * Apple serves these as HLS streams, so we cache the stream URLs and return
 * them to the renderer which plays them via hls.js.
 */

import { ipcMain, app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { get as httpsGet } from 'https'
import { request as httpRequest } from 'http'
import { createHash } from 'crypto'
import { URL } from 'url'
import { logger } from './logger'

// ── Config ──────────────────────────────────────────────────────────────────
// Primary storefront is derived from the system locale (e.g. 'gb', 'de', 'us').
// Falls back to 'us' if the locale can't be determined.
// FALLBACK_STOREFRONTS are tried in order when the primary yields no result.
const FALLBACK_STOREFRONTS = ['gb', 'us', 'au', 'de', 'jp', 'fr']

function getPrimaryStorefront(): string {
  const country = app.getLocaleCountryCode()
  return country ? country.toLowerCase() : 'us'
}
const TOKEN_MAX_AGE = 12 * 60 * 60 * 1000 // 12 hours
const NEGATIVE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days — confirmed no cover
const NETWORK_ERROR_CACHE_TTL = 30 * 60 * 1000     // 30 min — transient network errors
const URL_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours — HLS URLs expire

// ── State ───────────────────────────────────────────────────────────────────
let urlCachePath = '' // JSON file mapping album key → { url, ts }
let negativeCachePath = ''
let appleToken = ''
let tokenFetchedAt = 0
let urlCache: Record<string, { url: string; ts: number }> = {}
let negativeLookups: Record<string, number> = {} // key → timestamp

// ── Helpers ─────────────────────────────────────────────────────────────────
function albumKey(album: string, artist: string): string {
  const raw = `${album.trim().toLowerCase()}---${artist.trim().toLowerCase()}`
  return createHash('sha256').update(raw).digest('hex').substring(0, 24)
}

function loadUrlCache() {
  try {
    if (existsSync(urlCachePath)) {
      urlCache = JSON.parse(readFileSync(urlCachePath, 'utf-8'))
    }
  } catch { urlCache = {} }
}

function saveUrlCache() {
  try {
    writeFileSync(urlCachePath, JSON.stringify(urlCache))
  } catch {}
}

function loadNegativeCache() {
  try {
    if (existsSync(negativeCachePath)) {
      negativeLookups = JSON.parse(readFileSync(negativeCachePath, 'utf-8'))
    }
  } catch { negativeLookups = {} }
}

function saveNegativeCache() {
  try {
    writeFileSync(negativeCachePath, JSON.stringify(negativeLookups))
  } catch {}
}

function isNegativelyCached(key: string): boolean {
  const ts = negativeLookups[key]
  if (ts === undefined) return false
  const now = Date.now()
  // Negative timestamp = network/API error (short TTL)
  // Positive timestamp = confirmed no cover (long TTL)
  const ttl = ts < 0 ? NETWORK_ERROR_CACHE_TTL : NEGATIVE_CACHE_TTL
  if (now - Math.abs(ts) > ttl) {
    delete negativeLookups[key]
    return false
  }
  return true
}

// ── HTTPS helpers ───────────────────────────────────────────────────────────
function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const ua = `AuroraPlayer/${app.getVersion()}`
    const parsed = new URL(url)
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { 'User-Agent': ua, ...headers },
    }
    const requester = parsed.protocol === 'https:' ? httpsGet : httpRequest
    const req = requester(url, { ...opts }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchText(res.headers.location, headers))
        return
      }
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve(data))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}

// ── Apple Music Token ───────────────────────────────────────────────────────
async function getAppleMusicToken(): Promise<string> {
  if (appleToken && Date.now() - tokenFetchedAt < TOKEN_MAX_AGE) {
    return appleToken
  }

  // Fetch the Apple Music web player page to find JS bundle
  const html = await fetchText('https://music.apple.com/us/browse')

  // Find JS bundle URLs — Apple uses both relative (/assets/index~xxx.js)
  // and absolute (https://...assets/index...js) paths depending on version
  const relativeMatches = html.match(/(?:src|href)=["']?(\/assets\/index[^"'\s>]*\.js)/g)
  const absoluteMatches = html.match(/https:\/\/[^"'\s]*?\/assets\/index[^"'\s]*?\.js/g)

  const jsUrls: string[] = []
  if (relativeMatches) {
    for (const m of relativeMatches) {
      const path = m.replace(/^(?:src|href)=["']?/, '')
      jsUrls.push(`https://music.apple.com${path}`)
    }
  }
  if (absoluteMatches) {
    for (const u of absoluteMatches) {
      if (!jsUrls.includes(u)) jsUrls.push(u)
    }
  }

  if (jsUrls.length === 0) {
    throw new Error('Could not find Apple Music JS bundle URL')
  }

  // Try each JS bundle to find the token
  for (const jsUrl of jsUrls) {
    try {
      const js = await fetchText(jsUrl)
      // Apple embeds a JWT token (starts with "eyJ")
      const tokenMatch = js.match(/eyJh[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)
      if (tokenMatch) {
        appleToken = tokenMatch[0]
        tokenFetchedAt = Date.now()
        return appleToken
      }
    } catch {
      continue
    }
  }

  throw new Error('Could not extract Apple Music bearer token')
}

// ── Normalise strings for lenient comparison ────────────────────────────────
function normalizeStr(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics (é→e, ü→u, …)
    .toLowerCase()
    .replace(/^the\s+/, '')          // strip leading "The " / "the "
    .replace(/['']/g, "'")           // curly → straight apostrophe
    .replace(/[–—]/g, '-')           // em/en dash → hyphen
    .replace(/[^\w\s'-]/g, ' ')      // remove remaining punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Search Apple Music catalog ──────────────────────────────────────────────
interface AppleMusicAlbum {
  id: string
  attributes: {
    name: string
    artistName: string
    editorialVideo?: {
      motionSquareVideo1x1?: { video: string }
      motionDetailSquare?: { video: string }
      motionDetailTall?: { video: string }
      motionDetailTallVideo?: { video: string }
      motionSquareVideo?: { video: string }
    }
  }
}

function extractVideoUrl(ev: NonNullable<AppleMusicAlbum['attributes']['editorialVideo']>): string | null {
  return ev.motionSquareVideo1x1?.video
    || ev.motionDetailSquare?.video
    || ev.motionDetailTall?.video
    || ev.motionDetailTallVideo?.video
    || ev.motionSquareVideo?.video
    || null
}

async function searchAppleMusic(token: string, storefront: string, term: string): Promise<AppleMusicAlbum[]> {
  const url = `https://amp-api.music.apple.com/v1/catalog/${storefront}/search?types=albums&term=${encodeURIComponent(term)}&limit=25&extend=editorialVideo`
  const raw = await fetchText(url, {
    Authorization: `Bearer ${token}`,
    Origin: 'https://music.apple.com',
  })
  const data = JSON.parse(raw)
  return data?.results?.albums?.data || []
}

function findMatch(albums: AppleMusicAlbum[], normAlbum: string, normArtist: string, artistParts: string[]): string | null {
  function artistMatch(aArtist: string): boolean {
    return aArtist === normArtist
      || aArtist.includes(normArtist)
      || normArtist.includes(aArtist)
      || artistParts.some(p => p.length > 2 && (aArtist.includes(p) || p.includes(aArtist)))
  }

  // Pass 1: exact album name — avoids picking anniversary/deluxe editions over the original
  for (const a of albums) {
    if (normalizeStr(a.attributes.name) !== normAlbum) continue
    if (!artistMatch(normalizeStr(a.attributes.artistName))) continue
    if (a.attributes.editorialVideo) {
      const url = extractVideoUrl(a.attributes.editorialVideo)
      if (url) return url
    }
  }

  // Pass 2: contains match — handles minor name variations (remaster tags, subtitles, etc.)
  for (const a of albums) {
    const aName = normalizeStr(a.attributes.name)
    const nameMatch = aName.includes(normAlbum) || normAlbum.includes(aName)
    if (!nameMatch) continue
    if (!artistMatch(normalizeStr(a.attributes.artistName))) continue
    if (a.attributes.editorialVideo) {
      const url = extractVideoUrl(a.attributes.editorialVideo)
      if (url) return url
    }
  }

  return null
}

async function searchStorefront(token: string, storefront: string, album: string, artist: string,
  normAlbum: string, normArtist: string, artistParts: string[]): Promise<string | null> {
  // Query 1: combined "album artist" — best ranking
  const combined = await searchAppleMusic(token, storefront, `${album} ${artist}`)
  const hit1 = findMatch(combined, normAlbum, normArtist, artistParts)
  if (hit1) return hit1

  // Query 2: album-only fallback — catches cases where combined buries the result
  const albumOnly = await searchAppleMusic(token, storefront, album)
  const hit2 = findMatch(albumOnly, normAlbum, normArtist, artistParts)
  return hit2
}

async function searchAnimatedCover(album: string, artist: string): Promise<string | null> {
  const token = await getAppleMusicToken()
  const normAlbum = normalizeStr(album)
  const normArtist = normalizeStr(artist)
  const artistParts = normArtist
    .split(/[,;&]|\bfeat\.?\b|\bft\.?\b|\bwith\b/i)
    .map(s => s.trim()).filter(Boolean)

  // Try the user's own storefront first
  const primary = getPrimaryStorefront()
  const hit = await searchStorefront(token, primary, album, artist, normAlbum, normArtist, artistParts)
  if (hit) return hit

  // Fall back through other major storefronts (skip primary if already tried)
  for (const sf of FALLBACK_STOREFRONTS) {
    if (sf === primary) continue
    try {
      const fallbackHit = await searchStorefront(token, sf, album, artist, normAlbum, normArtist, artistParts)
      if (fallbackHit) {
        logger.debug(`Animated cover for "${album}" found in storefront "${sf}" (primary: "${primary}")`)
        return fallbackHit
      }
    } catch {
      // Non-fatal — try next storefront
    }
  }

  logger.debug(`No animated cover found for "${album}" by "${artist}" across all storefronts`)
  return null
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the local file path to an animated cover for the given album.
 * Returns null if no animated cover is available.
 * Fetches + caches automatically.
 */
async function getAnimatedCover(album: string, artist: string): Promise<string | null> {
  const key = albumKey(album, artist)

  // Check URL cache first (HLS URLs expire, so check TTL)
  const entry = urlCache[key]
  if (entry && Date.now() - entry.ts < URL_CACHE_TTL) {
    return entry.url
  }

  // Check negative cache
  if (isNegativelyCached(key)) return null

  try {
    const videoUrl = await searchAnimatedCover(album, artist)
    if (!videoUrl) {
      // Cache negative result
      negativeLookups[key] = Date.now()
      saveNegativeCache()
      return null
    }

    // Cache the HLS stream URL
    urlCache[key] = { url: videoUrl, ts: Date.now() }
    saveUrlCache()

    return videoUrl
  } catch (err) {
    logger.error(`Failed to fetch animated cover for "${album}" by "${artist}":`, err)
    // Network/transient error: cache with negative timestamp (short 30-min TTL)
    // so a temporary outage doesn't block the album for 7 days
    negativeLookups[key] = -Date.now()
    saveNegativeCache()
    return null
  }
}

/**
 * Get cache stats for the settings UI
 */
function getCacheStats(): { count: number } {
  const total = Object.keys(urlCache).length
  return { count: total }
}

/**
 * Clear all cached animated cover URLs
 */
function clearCache() {
  urlCache = {}
  saveUrlCache()
  negativeLookups = {}
  saveNegativeCache()
}

// ── IPC Registration ────────────────────────────────────────────────────────
export function registerAnimatedCoverIPC() {
  const dataPath = app.getPath('userData')
  urlCachePath = join(dataPath, 'animated-cover-urls.json')
  negativeCachePath = join(dataPath, 'animated-cover-negative.json')
  loadUrlCache()
  loadNegativeCache()

  ipcMain.handle('animated-cover:get', async (_, album: string, artist: string) => {
    return getAnimatedCover(album, artist)
  })

  ipcMain.handle('animated-cover:cache-stats', () => {
    return getCacheStats()
  })

  ipcMain.handle('animated-cover:clear-cache', () => {
    clearCache()
    return { ok: true }
  })
}
