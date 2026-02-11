export interface LyricLine {
  time: number // seconds
  text: string
}

/**
 * Parse an LRC file into an array of timed lyric lines.
 * Supports [mm:ss.xx], [mm:ss:xx] and [mm:ss] timestamps.
 * Multiple timestamps on a single line are expanded.
 */
export function parseLRC(lrcContent: string): LyricLine[] {
  const lines = lrcContent.split('\n')
  const lyrics: LyricLine[] = []
  const timeRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g

  for (const line of lines) {
    const timestamps: number[] = []
    let match: RegExpExecArray | null
    let lastIndex = 0

    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0
      timestamps.push(minutes * 60 + seconds + ms / 1000)
      lastIndex = match.index + match[0].length
    }

    timeRegex.lastIndex = 0

    if (timestamps.length > 0) {
      const text = line.substring(lastIndex).trim()
      for (const time of timestamps) {
        lyrics.push({ time, text })
      }
    }
  }

  lyrics.sort((a, b) => a.time - b.time)
  return lyrics
}

/**
 * Binary-ish search for the lyric line active at `currentTime`.
 * Returns -1 when before the first line.
 */
export function findCurrentLine(lyrics: LyricLine[], currentTime: number): number {
  if (lyrics.length === 0) return -1

  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time - 0.1) {
      return i
    }
  }

  return -1
}
