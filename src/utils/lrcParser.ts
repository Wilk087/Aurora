export interface LyricWord {
  time: number // seconds (when this word starts)
  text: string
}

export interface LyricLine {
  time: number // seconds
  text: string
  words?: LyricWord[] // present if enhanced LRC format
}

function parseTime(min: string, sec: string, frac?: string): number {
  const ms = frac ? parseInt(frac.padEnd(3, '0')) : 0
  return parseInt(min) * 60 + parseInt(sec) + ms / 1000
}

/** Returns true if the content contains enhanced LRC word-level timestamps */
export function isEnhancedLrc(content: string): boolean {
  return /<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/.test(content)
}

/**
 * Parse an LRC file into an array of timed lyric lines.
 * Supports [mm:ss.xx], [mm:ss:xx] and [mm:ss] timestamps.
 * Also supports enhanced LRC with <mm:ss.xx> word-level timestamps.
 * Multiple line timestamps on a single line are expanded.
 */
export function parseLRC(lrcContent: string): LyricLine[] {
  const lines = lrcContent.split('\n')
  const lyrics: LyricLine[] = []
  const lineTimeRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g
  const wordTimeRegex = /<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>/g

  for (const line of lines) {
    const timestamps: number[] = []
    let match: RegExpExecArray | null
    let lastIndex = 0

    while ((match = lineTimeRegex.exec(line)) !== null) {
      timestamps.push(parseTime(match[1], match[2], match[3]))
      lastIndex = match.index + match[0].length
    }
    lineTimeRegex.lastIndex = 0

    if (timestamps.length === 0) continue

    const afterTimestamps = line.substring(lastIndex)

    // Parse word-level timestamps if present
    const wordMatches: Array<{ time: number; index: number; length: number }> = []
    let wMatch: RegExpExecArray | null
    wordTimeRegex.lastIndex = 0
    while ((wMatch = wordTimeRegex.exec(afterTimestamps)) !== null) {
      wordMatches.push({
        time: parseTime(wMatch[1], wMatch[2], wMatch[3]),
        index: wMatch.index,
        length: wMatch[0].length,
      })
    }
    wordTimeRegex.lastIndex = 0

    let words: LyricWord[] | undefined
    let text: string

    if (wordMatches.length > 0) {
      const parsedWords: LyricWord[] = []
      for (let i = 0; i < wordMatches.length; i++) {
        const start = wordMatches[i].index + wordMatches[i].length
        const end = i + 1 < wordMatches.length ? wordMatches[i + 1].index : afterTimestamps.length
        const wordText = afterTimestamps.substring(start, end).trim()
        if (wordText) {
          parsedWords.push({ time: wordMatches[i].time, text: wordText })
        }
      }
      if (parsedWords.length > 0) {
        words = parsedWords
        text = parsedWords.map(w => w.text).join(' ')
      } else {
        text = afterTimestamps.trim()
      }
    } else {
      text = afterTimestamps.trim()
    }

    for (const time of timestamps) {
      lyrics.push({ time, text, words })
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
    if (currentTime >= lyrics[i].time - 0.1) return i
  }
  return -1
}

/**
 * Find the index of the word active at `currentTime` within a line's words array.
 * Returns -1 when before the first word.
 */
export function findCurrentWord(words: LyricWord[], currentTime: number): number {
  if (words.length === 0) return -1
  for (let i = words.length - 1; i >= 0; i--) {
    if (currentTime >= words[i].time - 0.05) return i
  }
  return -1
}
