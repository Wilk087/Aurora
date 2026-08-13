import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// electron is not available outside the app, so stub the two things updater.ts
// touches at import time.
vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getVersion: () => '2.9.0',
    getPath: () => '/usr/bin/aurora-player',
  },
}))
vi.mock('./logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const { compareVersions, updateMethodFor } = await import('./updater')

describe('compareVersions', () => {
  it('orders normal releases', () => {
    expect(compareVersions('2.9.0', '2.8.0')).toBeGreaterThan(0)
    expect(compareVersions('2.8.0', '2.9.0')).toBeLessThan(0)
    expect(compareVersions('2.9.0', '2.9.0')).toBe(0)
  })

  it('compares numerically, not lexically', () => {
    expect(compareVersions('2.10.0', '2.9.0')).toBeGreaterThan(0)
    expect(compareVersions('3.0.0', '2.99.99')).toBeGreaterThan(0)
  })

  it('tolerates a leading v', () => {
    expect(compareVersions('v2.9.0', '2.9.0')).toBe(0)
    expect(compareVersions('v2.9.1', 'v2.9.0')).toBeGreaterThan(0)
  })

  // This is the regression the old implementation had: any prerelease suffix
  // produced NaN, so the update check silently returned "no update" forever.
  it('treats a prerelease as older than its own release', () => {
    expect(compareVersions('2.9.0', '2.9.0-dev')).toBeGreaterThan(0)
    expect(compareVersions('2.9.0-dev', '2.9.0')).toBeLessThan(0)
  })

  it('never returns NaN for a prerelease', () => {
    for (const pair of [
      ['2.9.0', '2.9.0-dev'],
      ['2.9.0-dev', '2.8.0'],
      ['2.9.0-dev', '2.9.0-dev'],
      ['2.10.0-rc1', '2.9.0'],
    ] as const) {
      expect(Number.isNaN(compareVersions(pair[0], pair[1]))).toBe(false)
    }
  })

  it('sees a real release as newer than the dev build it came from', () => {
    expect(compareVersions('2.9.0', '2.9.0-dev')).toBeGreaterThan(0)
    expect(compareVersions('2.10.0', '2.9.0-dev')).toBeGreaterThan(0)
  })

  it('handles missing patch components', () => {
    expect(compareVersions('2.9', '2.9.0')).toBe(0)
    expect(compareVersions('3', '2.9.9')).toBeGreaterThan(0)
  })
})

describe('updateMethodFor', () => {
  it('lets self-contained builds update themselves', () => {
    expect(updateMethodFor('appimage')).toBe('auto')
    expect(updateMethodFor('nsis')).toBe('auto')
  })

  // Writing over a package manager's files corrupts its database. These must
  // never be 'auto'.
  it('never self-updates a package-managed install', () => {
    for (const source of ['pacman', 'deb', 'rpm', 'nix', 'flatpak'] as const) {
      expect(updateMethodFor(source)).toBe('package-manager')
    }
  })

  it('falls back to manual for anything unrecognised', () => {
    expect(updateMethodFor('windows-portable')).toBe('manual')
    expect(updateMethodFor('unknown')).toBe('manual')
    expect(updateMethodFor('dev')).toBe('manual')
  })
})

describe('detectInstallSource', () => {
  const envKeys = ['APPIMAGE', 'FLATPAK_ID', 'container', 'PORTABLE_EXECUTABLE_DIR']
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = Object.fromEntries(envKeys.map(k => [k, process.env[k]]))
    for (const k of envKeys) delete process.env[k]
  })

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it('recognises an AppImage by its env var', async () => {
    process.env.APPIMAGE = '/home/user/aurora-player-2.9.0.AppImage'
    const { detectInstallSource } = await import('./updater')
    expect(detectInstallSource()).toBe('appimage')
  })

  it('recognises flatpak', async () => {
    process.env.FLATPAK_ID = 'dev.wilk087.AuroraPlayer'
    const { detectInstallSource } = await import('./updater')
    expect(detectInstallSource()).toBe('flatpak')
  })
})
