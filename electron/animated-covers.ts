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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { get as httpsGet } from 'https'
import { request as httpRequest } from 'http'
import { createHash } from 'crypto'
import { URL } from 'url'

// ── Config ──────────────────────────────────────────────────────────────────
const STOREFRONT = 'us' // Apple Music storefront
const TOKEN_MAX_AGE = 12 * 60 * 60 * 1000 // 12 hours
const NEGATIVE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
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
  if (!ts) return false
  if (Date.now() - ts > NEGATIVE_CACHE_TTL) {
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
    }
  }
}

async function searchAnimatedCover(album: string, artist: string): Promise<string | null> {
  const token = await getAppleMusicToken()
  const term = encodeURIComponent(`${album} ${artist}`)
  const url = `https://amp-api.music.apple.com/v1/catalog/${STOREFRONT}/search?types=albums&term=${term}&limit=5&extend=editorialVideo`

  const raw = await fetchText(url, {
    Authorization: `Bearer ${token}`,
    Origin: 'https://music.apple.com',
  })

  const data = JSON.parse(raw)
  const albums: AppleMusicAlbum[] = data?.results?.albums?.data || []

  // Find best match
  const normalizedAlbum = album.trim().toLowerCase()
  const normalizedArtist = artist.trim().toLowerCase()

  for (const a of albums) {
    const aName = a.attributes.name.trim().toLowerCase()
    const aArtist = a.attributes.artistName.trim().toLowerCase()

    // Check name match (exact or contains)
    const nameMatch = aName === normalizedAlbum ||
      aName.includes(normalizedAlbum) ||
      normalizedAlbum.includes(aName)

    const artistMatch = aArtist === normalizedArtist ||
      aArtist.includes(normalizedArtist) ||
      normalizedArtist.includes(aArtist)

    if (nameMatch && artistMatch) {
      const ev = a.attributes.editorialVideo
      if (ev) {
        // Prefer square video, fallback to other formats
        const videoUrl = ev.motionSquareVideo1x1?.video
          || ev.motionDetailSquare?.video
          || ev.motionDetailTall?.video
        if (videoUrl) return videoUrl
      }
    }
  }

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
    console.error(`Failed to fetch animated cover for "${album}" by "${artist}":`, err)
    // Cache negative result on error too (to avoid hammering API)
    negativeLookups[key] = Date.now()
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
