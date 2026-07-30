import {
  SINGER_PREFIX_RE,
  parseSingerToken,
  formatSingerToken,
  type SingerId,
  type SingerMark,
} from './lyricSingers'

export interface LyricWord {
  time: number // seconds (when this word starts)
  text: string
}

export interface LyricLine {
  time: number // seconds
  text: string
  words?: LyricWord[] // present if enhanced LRC format
  translation?: string // optional translated line (e.g. from Netease tlyric)
  pronunciation?: string // optional romanized line (e.g. romaji)
  singer?: SingerId // optional vocalist, for per-singer (duet) display
  background?: boolean // background vocal (Apple's ttm:role="x-bg" equivalent)
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

    let afterTimestamps = line.substring(lastIndex)

    // A speaker prefix ("v2: ", "F: ", "v2+bg: ", …) marks who sings the line.
    // Strip it before word parsing so it never shows up as lyric text. Only
    // recognised tags are stripped, so a line like "So: …" stays intact.
    let mark: SingerMark = {}
    const prefixMatch = afterTimestamps.match(SINGER_PREFIX_RE)
    if (prefixMatch) {
      const parsed = parseSingerToken(prefixMatch[1])
      if (parsed) {
        mark = parsed
        afterTimestamps = afterTimestamps.slice(prefixMatch[0].length)
      }
    }

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
      lyrics.push({ time, text, words, singer: mark.singer, background: mark.background })
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

/** Index a secondary LRC string by rounded timestamp (10ms precision) */
function buildTimeMap(secondaryLrc: string): Map<number, string> {
  const map = new Map<number, string>()
  for (const line of parseLRC(secondaryLrc)) {
    if (line.text) map.set(Math.round(line.time * 100), line.text)
  }
  return map
}

/** Exact timestamp match, else the nearest entry within ±500ms */
function lookupNear(map: Map<number, string>, time: number): string | undefined {
  const key = Math.round(time * 100)
  if (map.has(key)) return map.get(key)
  for (let delta = 1; delta <= 50; delta++) {
    if (map.has(key + delta)) return map.get(key + delta)
    if (map.has(key - delta)) return map.get(key - delta)
  }
  return undefined
}

/**
 * Merge a secondary LRC string (translation or pronunciation) into an existing
 * lyrics array. Matches lines by timestamp (within 500ms tolerance) and
 * attaches the text to the closest matching original line under `field`.
 */
function mergeLrcField(
  lyrics: LyricLine[],
  secondaryLrc: string,
  field: 'translation' | 'pronunciation',
): LyricLine[] {
  const map = buildTimeMap(secondaryLrc)
  if (map.size === 0) return lyrics

  return lyrics.map(line => {
    const value = lookupNear(map, line.time)
    return value === undefined ? line : { ...line, [field]: value }
  })
}

/** Merge a translation LRC string into an existing lyrics array. */
export function mergeTranslations(lyrics: LyricLine[], translationLrc: string): LyricLine[] {
  return mergeLrcField(lyrics, translationLrc, 'translation')
}

/** Merge a pronunciation (e.g. romaji) LRC string into an existing lyrics array. */
export function mergePronunciations(lyrics: LyricLine[], pronunciationLrc: string): LyricLine[] {
  return mergeLrcField(lyrics, pronunciationLrc, 'pronunciation')
}

/**
 * Merge a singers sidecar (`[mm:ss.xx]v2`, `[mm:ss.xx]v2+bg`, …) into an
 * existing lyrics array. Unrecognised markings are ignored.
 */
export function mergeSingers(lyrics: LyricLine[], singersLrc: string): LyricLine[] {
  const map = buildTimeMap(singersLrc)
  if (map.size === 0) return lyrics

  return lyrics.map(line => {
    const mark = parseSingerToken(lookupNear(map, line.time))
    return mark ? { ...line, singer: mark.singer, background: mark.background } : line
  })
}

function formatLrcTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.floor((seconds % 1) * 100)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(m)}:${pad(s)}.${pad(cs)}`
}

/** Serialize per-line vocal markings into a `.singers.lrc` sidecar. */
export function serializeSingers(
  lines: Array<{ time: number; singer?: SingerId; background?: boolean }>,
): string {
  return lines
    .map(line => ({ time: line.time, token: formatSingerToken(line) }))
    .filter(entry => entry.token)
    .map(entry => `[${formatLrcTime(entry.time)}]${entry.token}`)
    .join('\n')
}
