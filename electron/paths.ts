/**
 * XDG Base Directory Specification paths for Aurora Player.
 *
 * On Linux, data is split across the standard XDG directories:
 *   config  → $XDG_CONFIG_HOME/aurora-player  (~/.config/aurora-player)
 *   data    → $XDG_DATA_HOME/aurora-player    (~/.local/share/aurora-player)
 *   cache   → $XDG_CACHE_HOME/aurora-player   (~/.cache/aurora-player)
 *   state   → $XDG_STATE_HOME/aurora-player   (~/.local/state/aurora-player)
 *
 * On Windows / macOS, all four paths point to Electron's userData directory
 * (conventional per-platform app data location).
 */

import { join } from 'path'
import { homedir } from 'os'

const APP_NAME = 'aurora-player'

function xdgBase(envVar: string, ...fallbackSegments: string[]): string {
  return process.env[envVar] || join(homedir(), ...fallbackSegments)
}

export interface AppPaths {
  /** settings.json lives here */
  config: string
  /** library, playlists, favorites, stats, themes, plugins, backups */
  data: string
  /** cover-cache, waveform-cache, artist-cache, tmp */
  cache: string
  /** log files */
  state: string
}

let _cached: AppPaths | null = null

export function getAppPaths(): AppPaths {
  if (_cached) return _cached

  if (process.platform === 'linux') {
    _cached = {
      config: join(xdgBase('XDG_CONFIG_HOME', '.config'),       APP_NAME),
      data:   join(xdgBase('XDG_DATA_HOME',   '.local', 'share'), APP_NAME),
      cache:  join(xdgBase('XDG_CACHE_HOME',  '.cache'),         APP_NAME),
      state:  join(xdgBase('XDG_STATE_HOME',  '.local', 'state'), APP_NAME),
    }
  } else {
    // Windows / macOS: Electron's userData is the conventional location
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    const userData = app.getPath('userData')
    _cached = { config: userData, data: userData, cache: userData, state: userData }
  }

  return _cached
}
