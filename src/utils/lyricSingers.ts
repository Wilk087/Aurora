/**
 * Per-singer lyrics — a duet/multi-vocalist display mode modelled on Apple
 * Music's Duet View, where each singer's lines sit on their own side of the
 * view and background vocals render smaller and quieter.
 *
 * This mirrors how Apple's TTML lyrics describe the same thing: `ttm:agent`
 * says *which* vocalist sings a line, and `ttm:role="x-bg"` marks it as a
 * background vocal. The two are independent — any singer can have background
 * lines — so they're kept as separate fields here too.
 *
 * A line's marking comes from either a speaker prefix inside the .lrc itself
 * (e.g. `[00:12.34]v2: line`, `[00:14.00]v2+bg: ooh`) or a hand-made assignment
 * stored in a `<track>.singers.lrc` sidecar next to the audio file.
 *
 * Position is the primary cue (as in Apple Music); colour is opt-in and fully
 * user-configurable via settings.
 */

export type SingerId = 'v1' | 'v2' | 'v3' | 'both'

/** A line's vocal marking: who sings it, and whether it's a background vocal */
export interface SingerMark {
  singer?: SingerId
  background?: boolean
}

/** Order used for the editor's buttons and the settings colour list */
export const SINGER_ORDER: SingerId[] = ['v1', 'v2', 'v3', 'both']

export const SINGER_LABELS: Record<SingerId, string> = {
  v1: 'Singer 1',
  v2: 'Singer 2',
  v3: 'Singer 3',
  both: 'Both',
}

/** Compact labels for the editor's per-line buttons */
export const SINGER_SHORT_LABELS: Record<SingerId, string> = {
  v1: '1',
  v2: '2',
  v3: '3',
  both: 'Both',
}

/**
 * Starting colours, used when colour-coding is switched on and as the
 * "reset" target. Singer 1 is white so a lead vocal looks untinted.
 */
export const DEFAULT_SINGER_COLORS: Record<SingerId, string> = {
  v1: '#ffffff',
  v2: '#a9d8ff',
  v3: '#ffd6a5',
  both: '#e2c8ff',
}

/** Alignment is the main cue — this is what Apple's Duet View relies on */
const SINGER_ALIGN: Record<SingerId, 'left' | 'right' | 'center'> = {
  v1: 'left',
  v2: 'right',
  v3: 'center',
  both: 'center',
}

/** Speaker aliases accepted in .lrc prefixes and sidecar tokens */
const SINGER_ALIASES: Record<string, SingerId> = {
  v1: 'v1', m: 'v1', male: 'v1',
  v2: 'v2', f: 'v2', female: 'v2',
  v3: 'v3',
  d: 'both', duet: 'both', both: 'both', all: 'both',
}

const BACKGROUND_ALIASES = new Set(['bg', 'background', 'x-bg'])

/**
 * Matches a leading `word:` or `word+word:` prefix. Whether it's actually a
 * speaker tag is decided by parseSingerToken, so ordinary lines that happen to
 * start with a word and a colon ("So: …") are left alone.
 */
export const SINGER_PREFIX_RE = /^\s*([a-z0-9-]+(?:\s*\+\s*[a-z0-9-]+)*)\s*:\s*/i

/**
 * Parse a marking token such as `v2`, `bg` or `v2+bg`.
 * Returns null when any part is unrecognised, so callers can tell a real
 * speaker tag from arbitrary text.
 */
export function parseSingerToken(raw: string | undefined | null): SingerMark | null {
  if (!raw) return null
  const parts = raw.toLowerCase().split('+').map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) return null

  const mark: SingerMark = {}
  for (const part of parts) {
    if (BACKGROUND_ALIASES.has(part)) {
      mark.background = true
      continue
    }
    const singer = SINGER_ALIASES[part]
    if (!singer) return null
    mark.singer = singer
  }
  return mark.singer || mark.background ? mark : null
}

/** Inverse of parseSingerToken — what gets written to the sidecar */
export function formatSingerToken(mark: SingerMark): string {
  const parts: string[] = []
  if (mark.singer) parts.push(mark.singer)
  if (mark.background) parts.push('bg')
  return parts.join('+')
}

export interface SingerDisplayOptions {
  /** Per-singer display turned on at all */
  enabled: boolean
  /** Tint lines by singer (off by default — position alone, like Apple Music) */
  colorsEnabled: boolean
  colors: Record<SingerId, string>
}

/** Resolve a singer's colour, falling back to the default if unset/invalid */
export function singerColor(singer: SingerId, colors?: Partial<Record<SingerId, string>>): string {
  const value = colors?.[singer]
  return value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : DEFAULT_SINGER_COLORS[singer]
}

/** #rgb / #rrggbb → rgba(), for deriving the active line's glow from its colour */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const int = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(int)) return `rgba(255, 255, 255, ${alpha})`
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`
}

/**
 * Inline styles for a lyric line. Empty when per-singer display is off or the
 * line is unmarked, so each view keeps its own default alignment.
 */
export function singerStyle(
  mark: SingerMark,
  opts: SingerDisplayOptions,
): Record<string, string> {
  if (!opts.enabled || !mark.singer) return {}

  const style: Record<string, string> = { textAlign: SINGER_ALIGN[mark.singer] }
  if (opts.colorsEnabled) {
    const color = singerColor(mark.singer, opts.colors)
    style['--singer-color'] = color
    style['--singer-glow'] = hexToRgba(color, 0.26)
  }
  return style
}

/** State classes for a lyric line (colour tint / background-vocal treatment) */
export function singerClasses(mark: SingerMark, opts: SingerDisplayOptions): string[] {
  if (!opts.enabled) return []
  const classes: string[] = []
  if (mark.singer && opts.colorsEnabled) classes.push('is-singer-colored')
  if (mark.background) classes.push('is-bg-vocal')
  return classes
}

/** Cycle a line's singer: unset → v1 → v2 → v3 → both → unset */
export function nextSinger(current: SingerId | undefined): SingerId | undefined {
  if (!current) return SINGER_ORDER[0]
  const i = SINGER_ORDER.indexOf(current)
  return i === -1 || i === SINGER_ORDER.length - 1 ? undefined : SINGER_ORDER[i + 1]
}
