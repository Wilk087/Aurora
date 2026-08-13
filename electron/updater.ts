/**
 * Update handling, aware of how Aurora was installed.
 *
 * Aurora ships through two very different kinds of channel:
 *
 *   Self-contained builds (AppImage, Windows installer) have no package manager
 *   behind them, so the app has to update itself. These use electron-updater.
 *
 *   Package-managed installs (pacman/AUR, deb, rpm, Nix) are owned by something
 *   else. Downloading and swapping our own binary underneath the package manager
 *   would corrupt its database, so we must never do it. These get a notification
 *   that points at the right command instead.
 *
 * Everything routes through detectInstallSource(). If you add a packaging target,
 * add it there and pick the correct UpdateMethod, or the app will silently do the
 * wrong thing for that channel.
 */

import { app } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import type { BrowserWindow } from 'electron'
import { logger } from './logger'

export type UpdateMethod =
  /** The app can download and apply the update itself. */
  | 'auto'
  /** The user has to download a new build by hand. */
  | 'manual'
  /** A package manager owns this install; tell the user which command to run. */
  | 'package-manager'

export type InstallSource =
  | 'appimage'
  | 'nsis'
  | 'windows-portable'
  | 'pacman'
  | 'deb'
  | 'rpm'
  | 'nix'
  | 'flatpak'
  | 'dev'
  | 'unknown'

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  url: string
  source: InstallSource
  method: UpdateMethod
  /** Shell command that updates this install, when a package manager owns it. */
  command?: string
}

const REPO = 'Wilk087/Aurora'
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`

// ── Install source detection ────────────────────────────────────────────────

/** Best-effort guess at which distro family we're on, for the update hint. */
function distroFamily(): string {
  try {
    if (!existsSync('/etc/os-release')) return ''
    const os = readFileSync('/etc/os-release', 'utf-8')
    const id = /^ID=(.*)$/m.exec(os)?.[1]?.replace(/"/g, '') ?? ''
    const like = /^ID_LIKE=(.*)$/m.exec(os)?.[1]?.replace(/"/g, '') ?? ''
    return `${id} ${like}`.toLowerCase()
  } catch {
    return ''
  }
}

export function detectInstallSource(): InstallSource {
  // Running from source via `npm run dev`.
  if (!app.isPackaged) return 'dev'

  // AppImage exports its own path; this is the most reliable signal we get.
  if (process.env.APPIMAGE) return 'appimage'

  // Flatpak sets both of these. Not a target today, but detect it so a future
  // Flatpak build doesn't silently fall through to 'unknown' and self-update.
  if (process.env.FLATPAK_ID || process.env.container === 'flatpak') return 'flatpak'

  if (process.platform === 'win32') {
    // electron-builder's portable target sets this; portable builds cannot
    // self-update because there is no installer to hand off to.
    return process.env.PORTABLE_EXECUTABLE_DIR ? 'windows-portable' : 'nsis'
  }

  if (process.platform === 'linux') {
    const exe = app.getPath('exe')

    if (exe.startsWith('/nix/store/')) return 'nix'

    // /opt is where the AUR -bin package unpacks the AppImage contents.
    if (exe.startsWith('/opt/aurora-player')) return 'pacman'

    if (exe.startsWith('/usr/')) {
      const family = distroFamily()
      if (/arch|manjaro|endeavour|cachyos/.test(family)) return 'pacman'
      if (/debian|ubuntu|mint|pop/.test(family)) return 'deb'
      if (/fedora|rhel|centos|suse/.test(family)) return 'rpm'
      return 'unknown'
    }
  }

  return 'unknown'
}

export function updateMethodFor(source: InstallSource): UpdateMethod {
  switch (source) {
    case 'appimage':
    case 'nsis':
      return 'auto'
    case 'pacman':
    case 'deb':
    case 'rpm':
    case 'nix':
    case 'flatpak':
      return 'package-manager'
    default:
      // windows-portable, dev, unknown: tell the user, let them decide.
      return 'manual'
  }
}

function updateCommandFor(source: InstallSource): string | undefined {
  switch (source) {
    case 'pacman':
      return 'pacman -Syu aurora-player-bin'
    case 'deb':
      return 'apt update && apt upgrade aurora-player'
    case 'rpm':
      return 'dnf upgrade aurora-player'
    case 'nix':
      return 'nix profile upgrade aurora-player'
    case 'flatpak':
      return 'flatpak update dev.wilk087.AuroraPlayer'
    default:
      return undefined
  }
}

// ── Version comparison ──────────────────────────────────────────────────────

/**
 * Compare two semver strings, prerelease-aware.
 *
 * Returns > 0 when a is newer than b. A prerelease sorts below its own release,
 * so 2.9.0-dev < 2.9.0, which is what lets a dev build see the real release.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const [core, pre = ''] = v.replace(/^v/, '').split('-', 2)
    const nums = core.split('.').map(n => {
      const parsed = Number.parseInt(n, 10)
      return Number.isNaN(parsed) ? 0 : parsed
    })
    while (nums.length < 3) nums.push(0)
    return { nums, pre }
  }

  const pa = parse(a)
  const pb = parse(b)

  for (let i = 0; i < 3; i++) {
    if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] - pb.nums[i]
  }

  // Equal core versions: no prerelease outranks any prerelease.
  if (pa.pre === pb.pre) return 0
  if (!pa.pre) return 1
  if (!pb.pre) return -1
  return pa.pre < pb.pre ? -1 : 1
}

// ── Update check ────────────────────────────────────────────────────────────

type FetchJSON = (url: string) => Promise<string>

/**
 * Ask GitHub for the newest release and decide what the user should do about it.
 * Resolves null when already current, or when the check fails.
 */
export async function checkForUpdate(fetchJSON: FetchJSON): Promise<UpdateInfo | null> {
  const source = detectInstallSource()
  const currentVersion = app.getVersion()

  try {
    const data = JSON.parse(await fetchJSON(RELEASES_API))
    const latestVersion = String(data.tag_name ?? '').replace(/^v/, '')
    if (!latestVersion) return null

    if (compareVersions(latestVersion, currentVersion) <= 0) return null

    return {
      currentVersion,
      latestVersion,
      url: data.html_url || `https://github.com/${REPO}/releases/tag/v${latestVersion}`,
      source,
      method: updateMethodFor(source),
      command: updateCommandFor(source),
    }
  } catch (err) {
    logger.warn('Update check failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

// ── electron-updater, for the self-contained builds only ────────────────────

let autoUpdaterReady = false

/**
 * Wire up electron-updater, but only for install sources that own their own
 * files. Returns false when this install is package-managed, so the caller
 * knows to fall back to a notification.
 */
export async function initAutoUpdater(getWindow: () => BrowserWindow | null): Promise<boolean> {
  const source = detectInstallSource()

  if (updateMethodFor(source) !== 'auto') {
    logger.info(`Auto-updater disabled: install source is "${source}"`)
    return false
  }

  try {
    // Imported lazily so a package-managed install never even loads it.
    const { autoUpdater } = await import('electron-updater')

    autoUpdater.autoDownload = false        // ask the user first
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = logger as any

    autoUpdater.on('download-progress', p => {
      getWindow()?.webContents.send('update:download-progress', {
        percent: p.percent,
        bytesPerSecond: p.bytesPerSecond,
        transferred: p.transferred,
        total: p.total,
      })
    })

    autoUpdater.on('update-downloaded', info => {
      logger.info(`Update ${info.version} downloaded, ready to install`)
      getWindow()?.webContents.send('update:downloaded', { version: info.version })
    })

    autoUpdater.on('error', err => {
      logger.error('Auto-updater error:', err?.message ?? String(err))
      getWindow()?.webContents.send('update:error', { message: err?.message ?? 'Update failed' })
    })

    autoUpdaterReady = true
    logger.info(`Auto-updater enabled for install source "${source}"`)
    return true
  } catch (err) {
    // electron-updater missing or unusable: not fatal, fall back to notifying.
    logger.warn('Auto-updater unavailable:', err instanceof Error ? err.message : String(err))
    return false
  }
}

export async function downloadUpdate(): Promise<void> {
  if (!autoUpdaterReady) throw new Error('Auto-updater is not enabled for this install')
  const { autoUpdater } = await import('electron-updater')
  await autoUpdater.checkForUpdates()
  await autoUpdater.downloadUpdate()
}

export async function quitAndInstall(): Promise<void> {
  if (!autoUpdaterReady) throw new Error('Auto-updater is not enabled for this install')
  const { autoUpdater } = await import('electron-updater')
  autoUpdater.quitAndInstall()
}
