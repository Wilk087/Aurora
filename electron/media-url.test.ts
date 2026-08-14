import { describe, it, expect, vi } from 'vitest'

// preload.ts calls contextBridge at import time, which only exists inside a
// real preload context.
vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: { invoke: vi.fn(), send: vi.fn(), on: vi.fn(), removeAllListeners: vi.fn() },
  webUtils: { getPathForFile: vi.fn() },
}))

const { buildMediaUrl, LOCALFILE_HOST } = await import('./preload')

/** Mirrors what electron/main.ts does inside protocol.handle('localfile'). */
function pathSeenByHandler(url: string): string {
  const parsed = new URL(url)
  let filePath = decodeURIComponent(parsed.pathname)
  if (/^\/[a-zA-Z]:/.test(filePath)) filePath = filePath.slice(1) // win32 branch
  return filePath
}

describe('buildMediaUrl', () => {
  it('puts the path in the pathname behind a non-empty host', () => {
    const url = buildMediaUrl('/home/user/song.flac')
    expect(url).toBe(`localfile://${LOCALFILE_HOST}/home/user/song.flac`)
    expect(new URL(url).host).toBe(LOCALFILE_HOST)
  })

  // The scheme is registered as `standard`, which requires a host. The old
  // localfile:///abs/path form has an empty host and is not valid for a
  // standard scheme.
  it('never produces an empty host', () => {
    for (const p of ['/a.flac', '/deep/nested/path/b.mp3', 'C:/Music/c.wav']) {
      expect(new URL(buildMediaUrl(p)).host).not.toBe('')
    }
  })

  it('round-trips back to the original path through the handler', () => {
    for (const p of [
      '/home/user/song.flac',
      '/home/user/A$AP Rocky/RIOT (Rowdy Pipe\'n).flac',
      '/home/user/cover#1.jpg',
      '/home/user/a?b&c=d+e.png',
      '/home/user/Ümläut Ärtist/track.opus',
    ]) {
      expect(pathSeenByHandler(buildMediaUrl(p))).toBe(p)
    }
  })

  it('normalises Windows paths so the drive letter is not read as a host', () => {
    const url = buildMediaUrl('C:\\Users\\w\\Music\\song.flac')
    expect(new URL(url).host).toBe(LOCALFILE_HOST)
    expect(pathSeenByHandler(url)).toBe('C:/Users/w/Music/song.flac')
  })

  it('passes HTTP(S) URLs through untouched', () => {
    const http = 'http://nas.local/rest/stream?id=7'
    const https = 'https://example.com/cover.jpg'
    expect(buildMediaUrl(http)).toBe(http)
    expect(buildMediaUrl(https)).toBe(https)
  })

  it('does not double-prefix an already-built URL', () => {
    const once = buildMediaUrl('/home/user/song.flac')
    expect(buildMediaUrl(once)).toBe(once)
  })

  it('returns an empty string for an empty path', () => {
    expect(buildMediaUrl('')).toBe('')
  })
})
