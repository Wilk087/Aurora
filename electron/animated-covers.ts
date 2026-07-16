/**
 * Animated Album Cover fetcher
 *
 * Uses the Apple Music catalog API to find "editorialVideo" (motion artwork)
 * for albums.  The bearer token is captured by intercepting network requests
 * from a hidden BrowserWindow that loads Apple Music — this is necessary
 * because Apple no longer embeds the token in any static JS bundle.
 *
 * Apple serves these as HLS streams, so we cache the stream URLs and return
 * them to the renderer which plays them via hls.js.
 */

import { ipcMain, app, BrowserWindow, session } from 'electron'
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
const FALLBACK_STOREFRONTS = ['us', 'gb', 'au', 'de', 'jp', 'fr']

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
let tokenFetchPromise: Promise<string> | null = null
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
export function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
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
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`))
        } else {
          resolve(data)
        }
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}

// ── Apple Music Token ───────────────────────────────────────────────────────
// Apple Music developer token capture.
// Strategy 1: intercept the Authorization header from network requests to amp-api.
// Strategy 2: after the page loads, extract the token from MusicKit's JS state.
// Strategy 1 can miss when the service worker serves amp-api responses from cache
// (no outgoing network request), so strategy 2 is the reliable fallback.
function fetchAppleMusicTokenViaWindow(): Promise<string> {
  return new Promise((resolve, reject) => {
    const appleSession = session.fromPartition('persist:apple-music-token', { cache: true })
    const filter = { urls: ['https://amp-api.music.apple.com/*', 'https://amp-api-edge.music.apple.com/*'] }

    let resolved = false
    let win: BrowserWindow | null = null

    const done = (token: string, source: string) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      appleToken = token
      tokenFetchedAt = Date.now()
      logger.info(`Apple Music token captured via ${source}`)
      cleanup()
      resolve(token)
    }

    const cleanup = () => {
      try { appleSession.webRequest.onSendHeaders(filter, null as any) } catch {}
      if (win && !win.isDestroyed()) { win.destroy(); win = null }
    }

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        cleanup()
        reject(new Error('Timed out waiting for Apple Music token'))
      }
    }, 30_000)

    // Strategy 1: network interception (works when page makes fresh API calls)
    appleSession.webRequest.onSendHeaders(filter, (details) => {
      if (resolved) return
      const headers = details.requestHeaders as Record<string, string>
      const auth = headers['Authorization'] ?? headers['authorization']
      if (auth?.startsWith('Bearer eyJ')) {
        done(auth.replace('Bearer ', ''), 'network interception')
      }
    })

    win = new BrowserWindow({
      show: false,
      webPreferences: {
        session: appleSession,
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Strategy 2: extract token from MusicKit JS after page loads.
    // MusicKit.getInstance().developerToken is set during initialization even
    // when amp-api responses are served from service worker cache.
    win.webContents.on('did-finish-load', () => {
      if (resolved) return
      win?.webContents.executeJavaScript(`
        new Promise(resolve => {
          let attempts = 0
          ;(function poll() {
            try {
              const t = window.MusicKit && window.MusicKit.getInstance().developerToken
              if (t && t.startsWith('eyJ')) { resolve(t); return }
            } catch {}
            if (++attempts < 30) setTimeout(poll, 500)
            else resolve(null)
          })()
        })
      `).then((token: unknown) => {
        if (typeof token === 'string' && token.startsWith('eyJ')) {
          done(token, 'MusicKit JS state')
        }
      }).catch(() => {})
    })

    logger.info('Opening hidden Apple Music window to capture token...')

    win.on('closed', () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        reject(new Error('Apple Music window closed before token was captured'))
      }
    })

    win.loadURL('https://music.apple.com/us/browse').catch((err) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        cleanup()
        reject(err)
      }
    })
  })
}

async function getAppleMusicToken(): Promise<string> {
  if (appleToken && Date.now() - tokenFetchedAt < TOKEN_MAX_AGE) {
    return appleToken
  }
  // Deduplicate concurrent callers — only one hidden window at a time
  if (!tokenFetchPromise) {
    tokenFetchPromise = fetchAppleMusicTokenViaWindow()
      .finally(() => { tokenFetchPromise = null })
  }
  return tokenFetchPromise
}

// ── Normalise strings for lenient comparison ────────────────────────────────
export function normalizeStr(s: string): string {
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
    artwork?: { url: string; width?: number; height?: number }
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
  // Note: do NOT include extend=editorialVideo here — Apple's search endpoint silently
  // returns 0 results when that parameter is present. We fetch editorial video separately
  // via fetchEditorialVideo() once we have a matching album ID.
  const url = `https://amp-api.music.apple.com/v1/catalog/${storefront}/search?types=albums&term=${encodeURIComponent(term)}&limit=25`
  const raw = await fetchText(url, {
    Authorization: `Bearer ${token}`,
    Origin: 'https://music.apple.com',
  })
  const data = JSON.parse(raw)
  return data?.results?.albums?.data || []
}

async function fetchEditorialVideo(token: string, storefront: string, albumId: string): Promise<string | null> {
  try {
    const url = `https://amp-api.music.apple.com/v1/catalog/${storefront}/albums/${albumId}?extend=editorialVideo`
    const raw = await fetchText(url, {
      Authorization: `Bearer ${token}`,
      Origin: 'https://music.apple.com',
    })
    const data = JSON.parse(raw)
    const ev = data?.data?.[0]?.attributes?.editorialVideo
    return ev ? extractVideoUrl(ev) : null
  } catch {
    return null
  }
}

function findMatchId(albums: AppleMusicAlbum[], normAlbum: string, normArtist: string, artistParts: string[]): string | null {
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
    return a.id
  }

  // Pass 2: contains match — handles minor name variations (remaster tags, subtitles, etc.)
  // Guard: only allow reverse containment (our name contains the AM name) when the AM name
  // is at least 40% of the word count of our name — prevents "SOS" from matching "SOS Deluxe: LANA"
  for (const a of albums) {
    const aName = normalizeStr(a.attributes.name)
    const aWords = aName.split(' ').length
    const normWords = normAlbum.split(' ').length
    const nameMatch = aName.includes(normAlbum)
      || (normAlbum.includes(aName) && aWords / normWords >= 0.4)
    if (!nameMatch) continue
    if (!artistMatch(normalizeStr(a.attributes.artistName))) continue
    return a.id
  }

  return null
}

async function searchStorefront(token: string, storefront: string, album: string, artist: string,
  normAlbum: string, normArtist: string, artistParts: string[]): Promise<string | null> {
  // Query 1: combined "album artist" — best ranking
  const combined = await searchAppleMusic(token, storefront, `${album} ${artist}`)
  const id1 = findMatchId(combined, normAlbum, normArtist, artistParts)
  if (id1) {
    const url = await fetchEditorialVideo(token, storefront, id1)
    if (url) return url
  }

  // Query 2: album-only fallback — catches cases where combined buries the result
  const albumOnly = await searchAppleMusic(token, storefront, album)
  const id2 = findMatchId(albumOnly, normAlbum, normArtist, artistParts)
  if (id2 && id2 !== id1) {
    const url = await fetchEditorialVideo(token, storefront, id2)
    if (url) return url
  }

  return null
}

async function searchAnimatedCover(album: string, artist: string): Promise<string | null> {
  logger.info(`Searching animated cover for "${album}" by "${artist}"`)
  const token = await getAppleMusicToken()
  logger.info(`Got Apple Music token (length: ${token.length})`)
  const normAlbum = normalizeStr(album)
  const normArtist = normalizeStr(artist)
  const artistParts = normArtist
    .split(/[,;&]|\bfeat\.?\b|\bft\.?\b|\bwith\b/i)
    .map(s => s.trim()).filter(Boolean)

  // Build ordered storefront list: user's locale first, then fallbacks (skip duplicates)
  const primary = getPrimaryStorefront()
  const storefronts = [primary, ...FALLBACK_STOREFRONTS.filter(sf => sf !== primary)]

  for (const sf of storefronts) {
    try {
      const hit = await searchStorefront(token, sf, album, artist, normAlbum, normArtist, artistParts)
      if (hit) {
        if (sf !== primary) logger.debug(`Animated cover for "${album}" found in storefront "${sf}" (primary: "${primary}")`)
        return hit
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

// ── Album + Artist artwork URL lookup (for Discord RPC) ─────────────────────
// Uses the public iTunes Search API for albums and Apple Music catalog for artists.
const artworkUrlCache = new Map<string, string | null>()
const artistArtworkCache = new Map<string, string | null>()

export async function getArtistArtworkUrl(artist: string): Promise<string | null> {
  const cacheKey = artist.toLowerCase()
  if (artistArtworkCache.has(cacheKey)) return artistArtworkCache.get(cacheKey)!

  try {
    const token = await getAppleMusicToken()
    const normArtist = normalizeStr(artist)
    const primary = getPrimaryStorefront()
    const storefronts = [primary, ...FALLBACK_STOREFRONTS.filter(sf => sf !== primary)]

    for (const sf of storefronts) {
      try {
        const url = `https://amp-api.music.apple.com/v1/catalog/${sf}/search?types=artists&term=${encodeURIComponent(artist)}&limit=10`
        const raw = await fetchText(url, {
          Authorization: `Bearer ${token}`,
          Origin: 'https://music.apple.com',
        })
        const artists: any[] = JSON.parse(raw)?.results?.artists?.data ?? []
        for (const a of artists) {
          const aName = normalizeStr(a.attributes?.name ?? '')
          if (aName === normArtist || aName.includes(normArtist) || normArtist.includes(aName)) {
            const artTemplate = a.attributes?.artwork?.url as string | undefined
            if (artTemplate) {
              const artUrl = artTemplate.replace('{w}', '512').replace('{h}', '512')
              artistArtworkCache.set(cacheKey, artUrl)
              return artUrl
            }
          }
        }
      } catch { continue }
    }
    // Token obtained and all storefronts searched — genuinely not found
    artistArtworkCache.set(cacheKey, null)
  } catch (err) {
    // Token fetch or other transient error — don't cache, allow retry
    logger.error('Discord artist art lookup error:', err)
  }

  return null
}

export async function getAlbumArtworkUrl(artist: string, album: string): Promise<string | null> {
  const cacheKey = `${artist}---${album}`.toLowerCase()
  if (artworkUrlCache.has(cacheKey)) return artworkUrlCache.get(cacheKey)!

  const normAlbum = normalizeStr(album)
  const normArtist = normalizeStr(artist)
  const artistParts = normArtist
    .split(/[,;&]|\bfeat\.?\b|\bft\.?\b|\bwith\b/i)
    .map(s => s.trim()).filter(Boolean)

  let searched = false
  for (const term of [`${album} ${artist}`, album]) {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=10&media=music`
      const raw = await fetchText(url)
      searched = true
      const data = JSON.parse(raw)
      const results: any[] = data?.results ?? []

      for (const r of results) {
        const rAlbum = normalizeStr(r.collectionName ?? '')
        const rArtist = normalizeStr(r.artistName ?? '')
        const albumMatch = rAlbum.includes(normAlbum) || normAlbum.includes(rAlbum)
        const artistMatch = rArtist === normArtist
          || rArtist.includes(normArtist)
          || normArtist.includes(rArtist)
          || artistParts.some(p => p.length > 2 && (rArtist.includes(p) || p.includes(rArtist)))
        if (!albumMatch || !artistMatch) continue

        const artUrl = (r.artworkUrl100 as string | undefined)
          ?.replace('100x100bb', '512x512bb')
        if (artUrl) {
          artworkUrlCache.set(cacheKey, artUrl)
          return artUrl
        }
      }
    } catch { /* network error for this term, try next */ }
  }

  // Only cache null if we actually got a response — not on total network failure
  if (searched) artworkUrlCache.set(cacheKey, null)
  else logger.warn(`Discord album art: network error for ${artist} — ${album}`)
  return null
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
