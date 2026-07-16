/**
 * Shared matching logic for the missing-tracks feature — used by the album
 * page (greyed-out rows) and the Albums view filter.
 */

export interface MissingEntry {
  entry: CanonicalTrack
  key: string
  /** Index of the local track this missing row should appear after (-1 = before all) */
  anchor: number
}

export interface TracklistMatch {
  missing: MissingEntry[]
  /** local track.id → canonical entry (for canonical numbering/disc) */
  localCanon: Map<string, CanonicalTrack>
}

/** Lenient title key: diacritics, case, punctuation and (…)/[…] suffixes ignored,
 *  so "Song (Remastered 2011)" still matches "Song" — errs on the side of NOT
 *  flagging a track as missing. */
export function normTitle(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(feat|ft|featuring|with)\.?\s.*$/, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Matches each canonical (official) track to a local one by title. Local tag
 *  numbering can be arbitrary (compilation rips etc.), so positions and numbers
 *  always come from the canonical tracklist for matched tracks.
 *  Returns null when nothing overlaps — the online result was almost certainly
 *  a different album. */
export function matchTracklist(
  tracks: Track[],
  canon: CanonicalTrack[],
  hidden: Set<string>,
): TracklistMatch | null {
  const localKeys = tracks.map(t => normTitle(t.title))
  const claimed = new Set<number>()
  const localCanon = new Map<string, CanonicalTrack>()
  const missing: MissingEntry[] = []
  const seen = new Set<string>()
  let matched = 0
  let lastLocalIdx = -1
  for (const entry of canon) {
    const key = normTitle(entry.title)
    if (!key || seen.has(key)) continue
    seen.add(key)
    const li = localKeys.findIndex((k, idx) =>
      !claimed.has(idx) && !!k && (k === key || (key.length > 3 && k.includes(key)) || (k.length > 3 && key.includes(k))),
    )
    if (li >= 0) {
      claimed.add(li)
      localCanon.set(tracks[li].id, entry)
      matched++
      // Running max keeps anchors monotonic even if local order differs from canonical
      lastLocalIdx = Math.max(lastLocalIdx, li)
    } else if (!hidden.has(key)) {
      missing.push({ entry, key, anchor: lastLocalIdx })
    }
  }
  return matched === 0 ? null : { missing, localCanon }
}

/** Number of missing tracks for an album (0 when no data / wrong match). */
export function countMissing(tracks: Track[], canon: CanonicalTrack[], hidden: Set<string>): number {
  return matchTracklist(tracks, canon, hidden)?.missing.length ?? 0
}
