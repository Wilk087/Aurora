/**
 * Custom MPRIS2 D-Bus service for Aurora Player.
 * Provides proper identity, cover art, and full playback control on Linux.
 * Uses dbus-next (pure JS, no native modules).
 */

import type { BrowserWindow } from 'electron'

let bus: any = null
let playerIface: any = null
let rootIface: any = null
let mainWindow: BrowserWindow | null = null

// Current state (updated from renderer via IPC)
let metadata: Record<string, any> = {}
let playbackStatus = 'Stopped'
let positionMicros = 0
let volumeLevel = 0.8

const SERVICE_NAME = 'org.mpris.MediaPlayer2.aurora_player'
const OBJECT_PATH = '/org/mpris/MediaPlayer2'

function sendCommand(command: string, data?: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('mpris:command', command, data)
  }
}

export async function initMpris(win: BrowserWindow) {
  if (process.platform !== 'linux') return

  mainWindow = win

  try {
    const dbus = require('dbus-next')
    const { Interface, ACCESS_READ, ACCESS_READWRITE } = dbus.interface
    const Variant = dbus.Variant

    bus = dbus.sessionBus()

    // ── Root interface: org.mpris.MediaPlayer2 ──────────────────────────────
    class MediaPlayer2 extends Interface {
      _identity = 'Aurora Player'
      _desktopEntry = 'aurora-player'
      _canQuit = true
      _canRaise = true
      _hasTrackList = false
      _supportedUriSchemes: string[] = []
      _supportedMimeTypes: string[] = [
        'audio/mpeg', 'audio/flac', 'audio/ogg', 'audio/opus',
        'audio/wav', 'audio/mp4', 'audio/aac', 'audio/x-ms-wma',
      ]

      get Identity() { return this._identity }
      get DesktopEntry() { return this._desktopEntry }
      get CanQuit() { return this._canQuit }
      get CanRaise() { return this._canRaise }
      get HasTrackList() { return this._hasTrackList }
      get SupportedUriSchemes() { return this._supportedUriSchemes }
      get SupportedMimeTypes() { return this._supportedMimeTypes }

      Quit() {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close()
      }

      Raise() {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
        }
      }
    }

    MediaPlayer2.configureMembers({
      properties: {
        Identity: { signature: 's', access: ACCESS_READ },
        DesktopEntry: { signature: 's', access: ACCESS_READ },
        CanQuit: { signature: 'b', access: ACCESS_READ },
        CanRaise: { signature: 'b', access: ACCESS_READ },
        HasTrackList: { signature: 'b', access: ACCESS_READ },
        SupportedUriSchemes: { signature: 'as', access: ACCESS_READ },
        SupportedMimeTypes: { signature: 'as', access: ACCESS_READ },
      },
      methods: {
        Quit: { inSignature: '', outSignature: '' },
        Raise: { inSignature: '', outSignature: '' },
      },
      signals: {},
    })

    // ── Player interface: org.mpris.MediaPlayer2.Player ─────────────────────
    class MediaPlayer2Player extends Interface {
      _playbackStatus = 'Stopped'
      _metadata: Record<string, any> = {
        'mpris:trackid': new Variant('o', '/org/mpris/MediaPlayer2/TrackList/NoTrack'),
      }
      _volume = 0.8
      _position = 0 // microseconds
      _rate = 1.0
      _minimumRate = 1.0
      _maximumRate = 1.0
      _canGoNext = true
      _canGoPrevious = true
      _canPlay = true
      _canPause = true
      _canSeek = true
      _canControl = true
      _loopStatus = 'None'
      _shuffle = false

      get PlaybackStatus() { return this._playbackStatus }
      get Metadata() { return this._metadata }
      get Volume() { return this._volume }

      set Volume(val: number) {
        this._volume = Math.max(0, Math.min(1, val))
        volumeLevel = this._volume
        sendCommand('volume', this._volume)
      }

      get Position() { return this._position }
      get Rate() { return this._rate }
      get MinimumRate() { return this._minimumRate }
      get MaximumRate() { return this._maximumRate }
      get CanGoNext() { return this._canGoNext }
      get CanGoPrevious() { return this._canGoPrevious }
      get CanPlay() { return this._canPlay }
      get CanPause() { return this._canPause }
      get CanSeek() { return this._canSeek }
      get CanControl() { return this._canControl }
      get LoopStatus() { return this._loopStatus }

      set LoopStatus(val: string) {
        this._loopStatus = val
        sendCommand('loop', val)
      }

      get Shuffle() { return this._shuffle }

      set Shuffle(val: boolean) {
        this._shuffle = val
        sendCommand('shuffle', val)
      }

      Play() { sendCommand('play') }
      Pause() { sendCommand('pause') }
      PlayPause() { sendCommand('playPause') }
      Next() { sendCommand('next') }
      Previous() { sendCommand('previous') }
      Stop() { sendCommand('stop') }

      Seek(offset: bigint) {
        const offsetUs = Number(offset)
        sendCommand('seek', offsetUs / 1_000_000) // Convert µs → seconds
      }

      SetPosition(_trackId: string, position: bigint) {
        const posUs = Number(position)
        sendCommand('seekAbsolute', posUs / 1_000_000) // Convert µs → seconds
      }

      OpenUri(_uri: string) {
        // Not implemented
      }

      // Signal
      Seeked(position: bigint) {
        return position
      }
    }

    MediaPlayer2Player.configureMembers({
      properties: {
        PlaybackStatus: { signature: 's', access: ACCESS_READ },
        Metadata: { signature: 'a{sv}', access: ACCESS_READ },
        Volume: { signature: 'd', access: ACCESS_READWRITE },
        Position: { signature: 'x', access: ACCESS_READ },
        Rate: { signature: 'd', access: ACCESS_READ },
        MinimumRate: { signature: 'd', access: ACCESS_READ },
        MaximumRate: { signature: 'd', access: ACCESS_READ },
        CanGoNext: { signature: 'b', access: ACCESS_READ },
        CanGoPrevious: { signature: 'b', access: ACCESS_READ },
        CanPlay: { signature: 'b', access: ACCESS_READ },
        CanPause: { signature: 'b', access: ACCESS_READ },
        CanSeek: { signature: 'b', access: ACCESS_READ },
        CanControl: { signature: 'b', access: ACCESS_READ },
        LoopStatus: { signature: 's', access: ACCESS_READWRITE },
        Shuffle: { signature: 'b', access: ACCESS_READWRITE },
      },
      methods: {
        Play: { inSignature: '', outSignature: '' },
        Pause: { inSignature: '', outSignature: '' },
        PlayPause: { inSignature: '', outSignature: '' },
        Next: { inSignature: '', outSignature: '' },
        Previous: { inSignature: '', outSignature: '' },
        Stop: { inSignature: '', outSignature: '' },
        Seek: { inSignature: 'x', outSignature: '' },
        SetPosition: { inSignature: 'ox', outSignature: '' },
        OpenUri: { inSignature: 's', outSignature: '' },
      },
      signals: {
        Seeked: { signature: 'x' },
      },
    })

    // Create instances with proper D-Bus interface names
    rootIface = new MediaPlayer2('org.mpris.MediaPlayer2')
    playerIface = new MediaPlayer2Player('org.mpris.MediaPlayer2.Player')

    // Export on the bus with the interface name
    bus.export(OBJECT_PATH, rootIface)
    bus.export(OBJECT_PATH, playerIface)

    // Request the well-known name
    await bus.requestName(SERVICE_NAME, 0)

    console.log('[MPRIS] Service registered:', SERVICE_NAME)
  } catch (err) {
    console.error('[MPRIS] Failed to initialize:', err)
    bus = null
    playerIface = null
    rootIface = null
  }
}

/** Update metadata (called from IPC when track changes) */
export function updateMprisMetadata(data: {
  title?: string
  artist?: string
  album?: string
  artUrl?: string
  length?: number // in seconds
  trackId?: string
}) {
  if (!playerIface) return

  try {
    const dbus = require('dbus-next')
    const Variant = dbus.Variant

    const meta: Record<string, any> = {
      'mpris:trackid': new Variant('o', data.trackId || '/org/mpris/MediaPlayer2/TrackList/NoTrack'),
    }

    if (data.title) meta['xesam:title'] = new Variant('s', data.title)
    if (data.artist) meta['xesam:artist'] = new Variant('as', [data.artist])
    if (data.album) meta['xesam:album'] = new Variant('s', data.album)
    if (data.artUrl) meta['mpris:artUrl'] = new Variant('s', data.artUrl)
    if (data.length != null) meta['mpris:length'] = new Variant('x', BigInt(Math.round(data.length * 1_000_000)))

    playerIface._metadata = meta
    metadata = meta

    // Emit PropertiesChanged signal
    Interface_emitPropertiesChanged(playerIface, { Metadata: meta }, [])
  } catch (err) {
    console.error('[MPRIS] Failed to update metadata:', err)
  }
}

/** Update playback status */
export function updateMprisPlaybackStatus(status: 'Playing' | 'Paused' | 'Stopped') {
  if (!playerIface) return
  try {
    playerIface._playbackStatus = status
    playbackStatus = status
    Interface_emitPropertiesChanged(playerIface, { PlaybackStatus: status }, [])
  } catch (err) {
    console.error('[MPRIS] Failed to update playback status:', err)
  }
}

/** Update position (in seconds) */
export function updateMprisPosition(seconds: number) {
  if (!playerIface) return
  positionMicros = Math.round(seconds * 1_000_000)
  playerIface._position = positionMicros
}

/** Update volume */
export function updateMprisVolume(vol: number) {
  if (!playerIface) return
  playerIface._volume = vol
  volumeLevel = vol
}

/** Update loop status */
export function updateMprisLoopStatus(mode: string) {
  if (!playerIface) return
  // Convert our modes to MPRIS LoopStatus
  const map: Record<string, string> = { off: 'None', all: 'Playlist', one: 'Track' }
  playerIface._loopStatus = map[mode] || 'None'
}

/** Update shuffle */
export function updateMprisShuffle(enabled: boolean) {
  if (!playerIface) return
  playerIface._shuffle = enabled
}

/** Emit Seeked signal */
export function emitMprisSeeked(seconds: number) {
  if (!playerIface) return
  try {
    playerIface.Seeked(BigInt(Math.round(seconds * 1_000_000)))
  } catch {}
}

/** Cleanup on exit */
export function destroyMpris() {
  if (bus) {
    try {
      bus.releaseName(SERVICE_NAME)
      bus.disconnect()
    } catch {}
    bus = null
    playerIface = null
    rootIface = null
  }
}

// Helper to emit org.freedesktop.DBus.Properties.PropertiesChanged
function Interface_emitPropertiesChanged(
  iface: any,
  changedProperties: Record<string, any>,
  invalidatedProperties: string[],
) {
  try {
    const dbus = require('dbus-next')
    const { Interface } = dbus.interface
    // Use the static method on Interface — it auto-wraps values to Variants
    Interface.emitPropertiesChanged(iface, changedProperties, invalidatedProperties)
  } catch (err) {
    // Silently fail — MPRIS property signals are non-critical
  }
}
