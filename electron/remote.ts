import express from 'express'
import { createServer, type Server as HttpServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { Bonjour } from 'bonjour-service'
import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { randomBytes, createHash } from 'crypto'
import { networkInterfaces } from 'os'
import { logger } from './logger'

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = 19876
const TOKEN_EXPIRY = 365 * 24 * 60 * 60 * 1000 // 1 year

// ── State ───────────────────────────────────────────────────────────────────
let httpServer: HttpServer | null = null
let wss: WebSocketServer | null = null
let bonjour: InstanceType<typeof Bonjour> | null = null
let mainWindow: BrowserWindow | null = null
let userDataPath = ''

// Current playback state — updated by renderer via IPC
let currentState: RemoteState = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  isShuffle: false,
  repeatMode: 'off',
  queue: [],
  currentIndex: -1,
}

export interface RemoteState {
  currentTrack: any | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isShuffle: boolean
  repeatMode: string
  queue: any[]
  currentIndex: number
}

// ── Security: PIN + trusted device tokens ──────────────────────────────────
interface TrustedDevice {
  token: string
  name: string         // user-agent or custom label
  ip: string
  createdAt: number
  lastSeen: number
}

interface RemoteConfig {
  enabled: boolean
  pin: string
  trustedDevices: TrustedDevice[]
}

function getConfigPath(): string {
  return join(userDataPath, 'remote-config.json')
}

function loadConfig(): RemoteConfig {
  const path = getConfigPath()
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, 'utf-8'))
      return {
        enabled: data.enabled ?? false,
        pin: data.pin || generatePin(),
        trustedDevices: Array.isArray(data.trustedDevices) ? data.trustedDevices : [],
      }
    } catch { /* fall through */ }
  }
  return { enabled: false, pin: generatePin(), trustedDevices: [] }
}

function saveConfig(config: RemoteConfig) {
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2))
}

function generatePin(): string {
  // 4-digit numeric PIN
  return String(Math.floor(1000 + Math.random() * 9000))
}

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/** Parse a User-Agent string into a human-readable "OS · Browser" label */
function parseDeviceName(ua?: string): string {
  if (!ua) return 'Unknown Device'

  // ── OS ──
  let os = 'Unknown OS'
  if (/Android/.test(ua)) {
    const m = ua.match(/Android\s+([\d.]+)/)
    os = m ? `Android ${m[1]}` : 'Android'
  } else if (/iPhone/.test(ua)) {
    os = 'iPhone'
  } else if (/iPad/.test(ua)) {
    os = 'iPad'
  } else if (/CrOS/.test(ua)) {
    os = 'ChromeOS'
  } else if (/Mac OS X/.test(ua)) {
    os = 'macOS'
  } else if (/Windows/.test(ua)) {
    os = 'Windows'
  } else if (/Linux/.test(ua)) {
    os = 'Linux'
  }

  // ── Browser ──
  let browser = ''
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Browser'
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari'

  return browser ? `${os} · ${browser}` : os
}

let pinRefreshInterval: ReturnType<typeof setInterval> | null = null
let config: RemoteConfig = { enabled: false, pin: '0000', trustedDevices: [] }

export function isRemoteEnabled(dataPath: string): boolean {
  userDataPath = dataPath
  const cfg = loadConfig()
  return cfg.enabled
}

function isAuthorized(req: express.Request): boolean {
  const authHeader = req.headers['authorization']
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  const device = config.trustedDevices.find(d => d.token === token)
  if (!device) return false
  // Update last seen
  device.lastSeen = Date.now()
  device.ip = getClientIp(req)
  saveConfig(config)
  return true
}

function isWsAuthorized(token: string): boolean {
  const device = config.trustedDevices.find(d => d.token === token)
  if (!device) return false
  device.lastSeen = Date.now()
  saveConfig(config)
  return true
}

function getClientIp(req: express.Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress || 'unknown'
}

// ── Helper: broadcast to all authenticated WS clients ─────────────────────
const authenticatedSockets = new Set<WebSocket>()

function broadcast(type: string, data: any) {
  if (!wss) return
  const msg = JSON.stringify({ type, data })
  authenticatedSockets.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  })
}

// Forward a command from remote client to renderer
function sendCommand(command: string, data?: any) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('remote:command', command, data)
}

// ── Get LAN IPs ─────────────────────────────────────────────────────────────
export function getLanIp(): string {
  const ips = getAllLanIps()
  return ips.length > 0 ? ips[0] : '127.0.0.1'
}

export function getAllLanIps(): string[] {
  const ips: string[] = []
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address)
      }
    }
  }
  return ips
}

// ── IPC request/response with timeout ───────────────────────────────────────
function requestFromRenderer(requestType: string, res: express.Response, timeoutMs = 5000) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    res.status(503).json({ error: 'Application not ready' })
    return
  }
  let responded = false
  const channel = `remote:response:${requestType}`
  const handler = (_: any, data: any) => {
    if (responded) return
    responded = true
    res.json(data)
  }
  ipcMain.once(channel, handler)
  mainWindow.webContents.send('remote:request', requestType)
  setTimeout(() => {
    if (!responded) {
      responded = true
      ipcMain.removeListener(channel, handler)
      res.status(504).json({ error: 'Timeout' })
    }
  }, timeoutMs)
}

// ── Start ───────────────────────────────────────────────────────────────────
export function startRemoteServer(win: BrowserWindow, getDataPath: () => string) {
  mainWindow = win
  userDataPath = getDataPath()
  config = loadConfig()

  const app = express()
  app.use(express.json())

  // ── Public endpoints (no auth required) ──────────────────────────────

  // PIN-based authentication: client sends PIN, gets a token back
  app.post('/api/auth', (req, res) => {
    const { pin, deviceName } = req.body
    if (pin !== config.pin) {
      return res.status(403).json({ error: 'Invalid PIN' })
    }
    const token = generateToken()
    const device: TrustedDevice = {
      token,
      name: deviceName || parseDeviceName(req.headers['user-agent'] as string),
      ip: getClientIp(req),
      createdAt: Date.now(),
      lastSeen: Date.now(),
    }
    config.trustedDevices.push(device)
    saveConfig(config)
    // Notify renderer about new device
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('remote:device-added', { name: device.name, ip: device.ip, createdAt: device.createdAt, lastSeen: device.lastSeen })
    }
    res.json({ token, deviceName: device.name })
  })

  // Check if auth is required (public — lets the UI know)
  app.get('/api/auth/status', (_req, res) => {
    res.json({ authRequired: true })
  })

  // Serve the mobile web UI (public — the UI handles auth itself)
  app.get('/', (_req, res) => {
    res.send(getWebUI())
  })

  // ── Auth middleware for all other /api routes ────────────────────────
  app.use('/api', (req, res, next) => {
    if (req.path === '/auth' || req.path === '/auth/status') return next()
    // Allow token as query param for resources loaded via <img src> etc.
    if (!req.headers['authorization'] && req.query.token) {
      req.headers['authorization'] = `Bearer ${req.query.token}`
    }
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized. Send PIN to POST /api/auth first.' })
    }
    next()
  })

  // Cover art: serve directly (authenticated)
  app.get('/api/cover', (req, res) => {
    const coverPath = req.query.path as string
    if (!coverPath) return res.status(400).end()
    if (coverPath.startsWith('http')) return res.redirect(coverPath)
    if (existsSync(coverPath)) {
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.send(readFileSync(coverPath))
    } else {
      res.status(404).end()
    }
  })

  // ── REST API: Library ────────────────────────────────────────────────
  app.get('/api/tracks', (_req, res) => requestFromRenderer('getTracks', res))
  app.get('/api/albums', (_req, res) => requestFromRenderer('getAlbums', res))
  app.get('/api/playlists', (_req, res) => requestFromRenderer('getPlaylists', res))
  app.get('/api/state', (_req, res) => res.json(currentState))

  // ── REST API: Playback commands ──────────────────────────────────────
  app.post('/api/play', (req, res) => { sendCommand('play', req.body); res.json({ ok: true }) })
  app.post('/api/pause', (_req, res) => { sendCommand('pause'); res.json({ ok: true }) })
  app.post('/api/toggle', (_req, res) => { sendCommand('togglePlay'); res.json({ ok: true }) })
  app.post('/api/next', (_req, res) => { sendCommand('next'); res.json({ ok: true }) })
  app.post('/api/previous', (_req, res) => { sendCommand('previous'); res.json({ ok: true }) })
  app.post('/api/seek', (req, res) => { sendCommand('seek', req.body.time); res.json({ ok: true }) })
  app.post('/api/volume', (req, res) => { sendCommand('volume', req.body.volume); res.json({ ok: true }) })
  app.post('/api/mute', (_req, res) => { sendCommand('toggleMute'); res.json({ ok: true }) })
  app.post('/api/shuffle', (_req, res) => { sendCommand('toggleShuffle'); res.json({ ok: true }) })
  app.post('/api/repeat', (_req, res) => { sendCommand('cycleRepeat'); res.json({ ok: true }) })

  // Play a specific track by ID
  app.post('/api/play-track', (req, res) => {
    sendCommand('playTrack', { trackId: req.body.trackId, albumKey: req.body.albumKey })
    res.json({ ok: true })
  })

  // Play an entire album
  app.post('/api/play-album', (req, res) => {
    sendCommand('playAlbum', { albumKey: req.body.albumKey, shuffle: req.body.shuffle, startIndex: req.body.startIndex || 0 })
    res.json({ ok: true })
  })

  // Queue management
  app.post('/api/play-next', (req, res) => { sendCommand('playNext', { trackId: req.body.trackId }); res.json({ ok: true }) })
  app.post('/api/play-later', (req, res) => { sendCommand('playLater', { trackId: req.body.trackId }); res.json({ ok: true }) })

  // ── HTTP + WebSocket server ──────────────────────────────────────────
  httpServer = createServer(app)
  wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (ws, req) => {
    // WebSocket auth: first message must be { type: "auth", token: "..." }
    let authed = false
    const authTimeout = setTimeout(() => {
      if (!authed) ws.close(4001, 'Auth timeout')
    }, 10000)

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())

        if (!authed) {
          if (msg.type === 'auth' && msg.token && isWsAuthorized(msg.token)) {
            authed = true
            clearTimeout(authTimeout)
            authenticatedSockets.add(ws)
            ws.send(JSON.stringify({ type: 'auth', status: 'ok' }))
            ws.send(JSON.stringify({ type: 'state', data: currentState }))
          } else if (msg.type === 'auth' && msg.pin) {
            // Allow PIN-based auth directly over WS too
            if (msg.pin === config.pin) {
              const token = generateToken()
              const device: TrustedDevice = {
                token,
                name: msg.deviceName || parseDeviceName(req.headers['user-agent'] as string),
                ip: req.socket.remoteAddress || 'unknown',
                createdAt: Date.now(),
                lastSeen: Date.now(),
              }
              config.trustedDevices.push(device)
              saveConfig(config)
              authed = true
              clearTimeout(authTimeout)
              authenticatedSockets.add(ws)
              ws.send(JSON.stringify({ type: 'auth', status: 'ok', token }))
              ws.send(JSON.stringify({ type: 'state', data: currentState }))
            } else {
              ws.send(JSON.stringify({ type: 'auth', status: 'failed', error: 'Invalid PIN' }))
            }
          } else {
            ws.send(JSON.stringify({ type: 'auth', status: 'required' }))
          }
          return
        }

        // Authenticated: handle commands
        if (msg.command) {
          sendCommand(msg.command, msg.data)
        }
      } catch { /* ignore malformed */ }
    })

    ws.on('close', () => {
      clearTimeout(authTimeout)
      authenticatedSockets.delete(ws)
    })
  })

  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`Aurora Remote: http://${getLanIp()}:${PORT}`)
  })

  // ── mDNS advertisement ──────────────────────────────────────────────
  try {
    bonjour = new Bonjour()
    bonjour.publish({
      name: 'Aurora Player',
      type: 'http',
      port: PORT,
      txt: { path: '/', version: '1', auth: 'pin' },
    })
  } catch (err) {
    logger.warn('mDNS publish failed (non-fatal):', err)
  }

  // ── PIN auto-refresh every 5 minutes ────────────────────────────────
  if (pinRefreshInterval) clearInterval(pinRefreshInterval)
  pinRefreshInterval = setInterval(() => {
    config.pin = generatePin()
    saveConfig(config)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('remote:pin-changed', config.pin)
    }
  }, 5 * 60 * 1000)

  // ── IPC: receive state updates from renderer ─────────────────────────
  ipcMain.on('remote:state-update', (_: any, state: Partial<RemoteState>) => {
    Object.assign(currentState, state)
    broadcast('state', currentState)
  })

  return { broadcast, getPort: () => PORT }
}

// ── Stop ────────────────────────────────────────────────────────────────────
export function stopRemoteServer() {
  if (pinRefreshInterval) { clearInterval(pinRefreshInterval); pinRefreshInterval = null }
  authenticatedSockets.clear()
  if (httpServer) { httpServer.close(); httpServer = null }
  if (wss) { wss.close(); wss = null }
  if (bonjour) { bonjour.destroy(); bonjour = null }
}

// ── IPC handlers for settings UI ────────────────────────────────────────────
export function registerRemoteIPC(getDataPath: () => string) {
  userDataPath = getDataPath()

  ipcMain.handle('remote:get-config', () => {
    config = loadConfig()
    return {
      enabled: config.enabled,
      pin: config.pin,
      trustedDevices: config.trustedDevices.map(d => ({
        name: d.name,
        ip: d.ip,
        createdAt: d.createdAt,
        lastSeen: d.lastSeen,
      })),
      lanIp: getLanIp(),
      lanIps: getAllLanIps(),
      port: PORT,
    }
  })

  ipcMain.handle('remote:set-enabled', (_, enabled: boolean) => {
    config.enabled = enabled
    saveConfig(config)
    return { enabled: config.enabled }
  })

  ipcMain.handle('remote:regenerate-pin', () => {
    config.pin = generatePin()
    saveConfig(config)
    return { pin: config.pin }
  })

  ipcMain.handle('remote:remove-device', (_, index: number) => {
    if (index >= 0 && index < config.trustedDevices.length) {
      config.trustedDevices.splice(index, 1)
      saveConfig(config)
    }
    return config.trustedDevices.map(d => ({
      name: d.name,
      ip: d.ip,
      createdAt: d.createdAt,
      lastSeen: d.lastSeen,
    }))
  })

  ipcMain.handle('remote:remove-all-devices', () => {
    config.trustedDevices = []
    saveConfig(config)
    return []
  })
}

// ── Inline web UI ───────────────────────────────────────────────────────────
function getWebUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Aurora Remote</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎵</text></svg>">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0e; color: #fff;
    display: flex; flex-direction: column; min-height: 100vh;
    overflow-x: hidden;
  }
  :root { --accent: #8b5cf6; --accent-hover: #a78bfa; }

  /* Auth screen */
  .auth-screen {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 2rem; gap: 1.5rem;
  }
  .auth-screen h1 { font-size: 1.5rem; font-weight: 700; }
  .auth-screen p { font-size: .9rem; opacity: .6; text-align: center; max-width: 320px; }
  .pin-input {
    background: #1a1a1e; border: 1px solid #333; color: #fff;
    font-size: 2rem; text-align: center; letter-spacing: .5em;
    padding: .75rem 1rem; border-radius: 12px; width: 200px;
    outline: none;
  }
  .pin-input:focus { border-color: var(--accent); }
  .auth-btn {
    background: var(--accent); color: #fff; border: none;
    padding: .75rem 2rem; border-radius: 12px; font-size: 1rem;
    font-weight: 600; cursor: pointer;
  }
  .auth-btn:active { transform: scale(.97); }
  .auth-error { color: #f87171; font-size: .85rem; }

  /* Player screen */
  .player-screen { display: none; flex-direction: column; min-height: 100vh; }
  .player-screen.active { display: flex; }
  .now-playing {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 1.5rem 2rem; gap: 1.25rem;
  }
  .cover-wrap {
    width: min(72vw, 320px); height: min(72vw, 320px);
    border-radius: 16px; background: #1a1a1e; overflow: hidden;
    box-shadow: 0 8px 40px rgba(0,0,0,.5);
  }
  .cover-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .no-cover {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,.15); font-size: 4rem;
  }
  .track-info { text-align: center; max-width: 90vw; }
  .track-title {
    font-size: 1.2rem; font-weight: 600; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; max-width: 80vw;
  }
  .track-artist { font-size: .9rem; opacity: .6; margin-top: .15rem; }
  .track-album { font-size: .8rem; opacity: .4; margin-top: .1rem; }

  /* Progress */
  .progress-wrap { width: 100%; max-width: 400px; padding: 0 1rem; }
  .progress-bar {
    width: 100%; height: 6px; background: #222; border-radius: 3px;
    cursor: pointer; position: relative; overflow: hidden;
  }
  .progress-fill {
    height: 100%; background: var(--accent); border-radius: 3px;
    transition: width .5s linear; pointer-events: none;
  }
  .progress-times {
    display: flex; justify-content: space-between;
    font-size: .7rem; opacity: .4; margin-top: .3rem; font-variant-numeric: tabular-nums;
  }

  /* Controls */
  .controls {
    display: flex; align-items: center; justify-content: center;
    gap: 1rem; padding: 1rem 0 .5rem;
  }
  .ctrl {
    background: none; border: none; color: #fff; cursor: pointer;
    width: 44px; height: 44px; display: flex; align-items: center;
    justify-content: center; border-radius: 50%; opacity: .7;
    transition: opacity .15s, background .15s;
  }
  .ctrl:hover { opacity: 1; }
  .ctrl:active { transform: scale(.92); }
  .ctrl svg { width: 22px; height: 22px; fill: currentColor; }
  .ctrl.primary {
    width: 56px; height: 56px; background: var(--accent); opacity: 1;
  }
  .ctrl.primary svg { width: 26px; height: 26px; }
  .ctrl.active { color: var(--accent); opacity: 1; }

  /* Volume */
  .volume-row {
    display: flex; align-items: center; gap: .6rem;
    padding: 0 2rem .75rem; max-width: 380px; margin: 0 auto; width: 100%;
  }
  .vol-icon { opacity: .5; cursor: pointer; display: flex; }
  .vol-icon svg { width: 18px; height: 18px; fill: currentColor; }
  .vol-slider {
    flex: 1; -webkit-appearance: none; appearance: none;
    height: 4px; background: #333; border-radius: 2px; outline: none;
  }
  .vol-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px;
    background: var(--accent); border-radius: 50%; cursor: pointer;
  }

  /* Bottom nav */
  .bottom-nav {
    display: flex; border-top: 1px solid #1a1a1e;
    background: #0a0a0e; padding: .5rem 0; padding-bottom: env(safe-area-inset-bottom, .5rem);
  }
  .nav-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: .2rem; background: none; border: none; color: #fff;
    opacity: .4; cursor: pointer; padding: .4rem 0; font-size: .65rem;
  }
  .nav-btn.active { opacity: 1; color: var(--accent); }
  .nav-btn svg { width: 22px; height: 22px; fill: currentColor; }

  /* Library overlay */
  .library-view {
    position: fixed; inset: 0; background: #0a0a0e; z-index: 50;
    display: none; flex-direction: column;
  }
  .library-view.open { display: flex; }
  .lib-header {
    display: flex; align-items: center; padding: .75rem; gap: .5rem;
    border-bottom: 1px solid #1a1a1e;
  }
  .lib-back {
    background: none; border: none; color: #fff; font-size: 1.3rem;
    cursor: pointer; padding: .25rem .5rem; opacity: .7;
  }
  .lib-search {
    flex: 1; background: #1a1a1e; border: 1px solid #222; color: #fff;
    padding: .5rem .75rem; border-radius: 10px; font-size: .9rem; outline: none;
  }
  .lib-search:focus { border-color: #444; }
  .lib-tabs {
    display: flex; border-bottom: 1px solid #1a1a1e;
  }
  .lib-tab {
    flex: 1; padding: .55rem; text-align: center; background: none;
    border: none; color: #fff; opacity: .4; cursor: pointer;
    font-size: .8rem; border-bottom: 2px solid transparent; transition: all .15s;
  }
  .lib-tab.active { opacity: 1; border-bottom-color: var(--accent); }
  .lib-list { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .lib-item {
    display: flex; align-items: center; gap: .65rem;
    padding: .55rem 1rem; border-bottom: 1px solid #111; cursor: pointer;
  }
  .lib-item:active { background: rgba(139,92,246,.1); }
  .lib-cover {
    width: 42px; height: 42px; border-radius: 6px;
    background: #1a1a1e; object-fit: cover; flex-shrink: 0;
  }
  .lib-info { flex: 1; overflow: hidden; }
  .lib-title { font-size: .85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lib-sub { font-size: .7rem; opacity: .45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Queue overlay */
  .queue-view {
    position: fixed; inset: 0; background: #0a0a0e; z-index: 50;
    display: none; flex-direction: column;
  }
  .queue-view.open { display: flex; }
  .q-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: .75rem 1rem; border-bottom: 1px solid #1a1a1e;
  }
  .q-header h2 { font-size: 1rem; font-weight: 600; }
  .q-current {
    background: rgba(139,92,246,.1); border-left: 3px solid var(--accent);
  }
</style>
</head>
<body>

<!-- Auth Screen -->
<div class="auth-screen" id="authScreen">
  <h1>Aurora Remote</h1>
  <p>Enter the PIN shown in Aurora's Settings on your desktop to connect.</p>
  <input type="tel" class="pin-input" id="pinInput" maxlength="4" placeholder="····" autocomplete="off" inputmode="numeric">
  <button class="auth-btn" onclick="submitPin()">Connect</button>
  <div class="auth-error" id="authError"></div>
</div>

<!-- Player Screen -->
<div class="player-screen" id="playerScreen">
  <div class="now-playing">
    <div class="cover-wrap" id="coverWrap">
      <div class="no-cover" id="noCover">♪</div>
      <img id="cover" style="display:none" alt="">
    </div>
    <div class="track-info">
      <div class="track-title" id="title">Not playing</div>
      <div class="track-artist" id="artist"></div>
      <div class="track-album" id="album"></div>
    </div>
    <div class="progress-wrap">
      <div class="progress-bar" id="pbar">
        <div class="progress-fill" id="pfill"></div>
      </div>
      <div class="progress-times">
        <span id="elapsed">0:00</span>
        <span id="remaining">0:00</span>
      </div>
    </div>
  </div>

  <div class="controls">
    <button class="ctrl" id="shuffleBtn" onclick="cmd('toggleShuffle')" title="Shuffle">
      <svg viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
    </button>
    <button class="ctrl" onclick="cmd('previous')" title="Previous">
      <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
    </button>
    <button class="ctrl primary" id="playBtn" onclick="cmd('togglePlay')" title="Play/Pause">
      <svg viewBox="0 0 24 24" id="playIcon"><path d="M8 5v14l11-7z"/></svg>
    </button>
    <button class="ctrl" onclick="cmd('next')" title="Next">
      <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
    </button>
    <button class="ctrl" id="repeatBtn" onclick="cmd('cycleRepeat')" title="Repeat">
      <svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
    </button>
  </div>

  <div class="volume-row">
    <span class="vol-icon" onclick="cmd('toggleMute')">
      <svg viewBox="0 0 24 24" id="volIcon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
    </span>
    <input type="range" class="vol-slider" id="volSlider" min="0" max="100" value="80" oninput="cmdVol(this.value)">
  </div>

  <div class="bottom-nav">
    <button class="nav-btn active" id="navNow" onclick="showView('player')">
      <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
      Now
    </button>
    <button class="nav-btn" id="navLib" onclick="showView('library')">
      <svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg>
      Library
    </button>
    <button class="nav-btn" id="navQueue" onclick="showView('queue')">
      <svg viewBox="0 0 24 24"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
      Queue
    </button>
  </div>
</div>

<!-- Library View -->
<div class="library-view" id="libView">
  <div class="lib-header">
    <button class="lib-back" onclick="showView('player')">&larr;</button>
    <input type="text" class="lib-search" id="libSearch" placeholder="Search..." oninput="filterLib()">
  </div>
  <div class="lib-tabs">
    <button class="lib-tab active" id="tabSongs" onclick="switchTab('songs')">Songs</button>
    <button class="lib-tab" id="tabAlbums" onclick="switchTab('albums')">Albums</button>
  </div>
  <div class="lib-list" id="libList"></div>
</div>

<!-- Queue View -->
<div class="queue-view" id="queueView">
  <div class="q-header">
    <button class="lib-back" onclick="showView('player')">&larr;</button>
    <h2>Up Next</h2>
    <div></div>
  </div>
  <div class="lib-list" id="queueList"></div>
</div>

<script>
const API='',WS_URL='ws://'+location.host;
let ws,state={},token=localStorage.getItem('aurora_token'),
    tracks=[],albums=[],libTab='songs';
function authParam(){return token?'&token='+encodeURIComponent(token):''}

// ── Auth ────────────────────────────────────────────────────────────────
function showAuth(){document.getElementById('authScreen').style.display='';document.getElementById('playerScreen').classList.remove('active')}
function showPlayer(){document.getElementById('authScreen').style.display='none';document.getElementById('playerScreen').classList.add('active')}

async function submitPin(){
  const pin=document.getElementById('pinInput').value;
  document.getElementById('authError').textContent='';
  try{
    const r=await fetch(API+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})});
    const d=await r.json();
    if(!r.ok){document.getElementById('authError').textContent=d.error||'Failed';return}
    token=d.token;localStorage.setItem('aurora_token',token);
    showPlayer();connect();loadLibrary();
  }catch(e){document.getElementById('authError').textContent='Connection failed'}
}

// ── Start ───────────────────────────────────────────────────────────────
if(token){showPlayer();connect();loadLibrary()}else{showAuth()}

// ── WebSocket ───────────────────────────────────────────────────────────
function connect(){
  if(!token)return;
  ws=new WebSocket(WS_URL);
  ws.onopen=()=>{ws.send(JSON.stringify({type:'auth',token}))};
  ws.onmessage=(e)=>{
    const m=JSON.parse(e.data);
    if(m.type==='auth'){
      if(m.status==='ok'){}
      else if(m.status==='failed'||m.status==='required'){
        token=null;localStorage.removeItem('aurora_token');showAuth();
      }
    }
    if(m.type==='state')updateUI(m.data);
  };
  ws.onclose=()=>setTimeout(connect,3000);
  ws.onerror=()=>{try{ws.close()}catch(e){}};
}

function cmd(c,d){if(ws&&ws.readyState===1)ws.send(JSON.stringify({command:c,data:d}))}
function cmdVol(v){cmd('volume',v/100)}

// ── UI Updates ──────────────────────────────────────────────────────────
function fmt(s){if(!s||!isFinite(s))return'0:00';const m=Math.floor(s/60),sec=Math.floor(s%60);return m+':'+(sec<10?'0':'')+sec}

function updateUI(s){
  state=s;const t=s.currentTrack;
  document.getElementById('title').textContent=t?t.title:'Not playing';
  document.getElementById('artist').textContent=t?t.artist:'';
  document.getElementById('album').textContent=t?t.album:'';
  const img=document.getElementById('cover'),nc=document.getElementById('noCover');
  if(t&&t.coverArt){
    const src=t.coverArt.startsWith('http')?t.coverArt:API+'/api/cover?path='+encodeURIComponent(t.coverArt)+authParam();
    if(img.src!==src)img.src=src;
    img.style.display='';nc.style.display='none';
  }else{img.style.display='none';nc.style.display=''}
  const pct=s.duration>0?(s.currentTime/s.duration)*100:0;
  document.getElementById('pfill').style.width=pct+'%';
  document.getElementById('elapsed').textContent=fmt(s.currentTime);
  document.getElementById('remaining').textContent='-'+fmt(s.duration-s.currentTime);
  document.getElementById('playIcon').innerHTML=s.isPlaying?'<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>':'<path d="M8 5v14l11-7z"/>';
  document.getElementById('shuffleBtn').classList.toggle('active',s.isShuffle);
  document.getElementById('repeatBtn').classList.toggle('active',s.repeatMode!=='off');
  document.getElementById('volSlider').value=Math.round(s.volume*100);
  updateQueue();
}

// ── Progress seek ───────────────────────────────────────────────────────
document.getElementById('pbar').addEventListener('click',(e)=>{
  const r=e.currentTarget.getBoundingClientRect();
  cmd('seek',(e.clientX-r.left)/r.width*(state.duration||0));
});

// ── Views ───────────────────────────────────────────────────────────────
function showView(v){
  document.getElementById('libView').classList.toggle('open',v==='library');
  document.getElementById('queueView').classList.toggle('open',v==='queue');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(v==='library'?'navLib':v==='queue'?'navQueue':'navNow').classList.add('active');
}

// ── Library ─────────────────────────────────────────────────────────────
async function loadLibrary(){
  if(!token)return;
  try{
    const h={'Authorization':'Bearer '+token};
    const[tr,al]=await Promise.all([
      fetch(API+'/api/tracks',{headers:h}).then(r=>r.ok?r.json():[]),
      fetch(API+'/api/albums',{headers:h}).then(r=>r.ok?r.json():[]),
    ]);
    tracks=tr;albums=al;renderLib();
  }catch(e){console.error(e)}
}

function switchTab(t){
  libTab=t;
  document.getElementById('tabSongs').classList.toggle('active',t==='songs');
  document.getElementById('tabAlbums').classList.toggle('active',t==='albums');
  renderLib();
}
function filterLib(){renderLib()}
function coverUrl(ca){
  if(!ca)return'';
  return ca.startsWith('http')?ca:API+'/api/cover?path='+encodeURIComponent(ca)+authParam();
}
function esc(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML}
function renderLib(){
  const q=(document.getElementById('libSearch').value||'').toLowerCase();
  const el=document.getElementById('libList');el.innerHTML='';
  if(libTab==='songs'){
    const f=q?tracks.filter(t=>(t.title+t.artist+t.album).toLowerCase().includes(q)):tracks;
    f.slice(0,300).forEach(t=>{
      const d=document.createElement('div');d.className='lib-item';
      d.onclick=()=>{cmd('playTrack',{trackId:t.id});showView('player')};
      const c=coverUrl(t.coverArt);
      d.innerHTML=(c?'<img class="lib-cover" src="'+c+'" loading="lazy">':'<div class="lib-cover"></div>')
        +'<div class="lib-info"><div class="lib-title">'+esc(t.title)+'</div><div class="lib-sub">'+esc(t.artist)+'</div></div>';
      el.appendChild(d);
    });
  }else{
    const f=q?albums.filter(a=>(a.name+a.artist).toLowerCase().includes(q)):albums;
    f.forEach(a=>{
      const d=document.createElement('div');d.className='lib-item';
      d.onclick=()=>{cmd('playAlbum',{albumKey:a.key});showView('player')};
      const c=coverUrl(a.coverArt);
      d.innerHTML=(c?'<img class="lib-cover" src="'+c+'" loading="lazy">':'<div class="lib-cover"></div>')
        +'<div class="lib-info"><div class="lib-title">'+esc(a.name)+'</div><div class="lib-sub">'+esc(a.artist)+' · '+a.trackCount+' tracks</div></div>';
      el.appendChild(d);
    });
  }
}

// ── Queue ───────────────────────────────────────────────────────────────
function updateQueue(){
  if(!state.queue)return;
  const el=document.getElementById('queueList');el.innerHTML='';
  state.queue.forEach((t,i)=>{
    const d=document.createElement('div');
    d.className='lib-item'+(i===state.currentIndex?' q-current':'');
    d.onclick=()=>cmd('playFromQueue',{index:i});
    const c=coverUrl(t.coverArt);
    d.innerHTML=(c?'<img class="lib-cover" src="'+c+'" loading="lazy">':'<div class="lib-cover"></div>')
      +'<div class="lib-info"><div class="lib-title">'+esc(t.title)+'</div><div class="lib-sub">'+esc(t.artist)+'</div></div>';
    el.appendChild(d);
  });
}

// Auto-submit PIN on 4 digits
document.getElementById('pinInput').addEventListener('input',function(){if(this.value.length===4)submitPin()});
</script>
</body>
</html>`
}
