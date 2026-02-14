/**
 * Split a potentially multi-artist string into individual artist names.
 *
 * Handles common delimiters: "; ", " / ", " feat. ", " ft. ", " featuring "
 * For ", " splitting, uses heuristics to avoid breaking names like
 * "Tyler, The Creator" — if the part after the comma starts with a common
 * continuation word (the, and, of, etc.), it stays merged.
 */

const CONTINUATION_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'from',
  'with', 'for', 'to', 'by', 'as', 'into', 'not', 'no',
  'his', 'her', 'their', 'my', 'our', 'your', 'its',
  'el', 'la', 'las', 'los', 'le', 'les', 'de', 'del', 'das', 'die', 'der',
])

function smartCommaSplit(str: string): string[] {
  const segments = str.split(', ')
  if (segments.length <= 1) return [str]

  const result: string[] = []
  for (const seg of segments) {
    const trimmed = seg.trim()
    if (!trimmed) continue
    const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase()

    // If the segment starts with a continuation word, merge with previous
    if (result.length > 0 && CONTINUATION_WORDS.has(firstWord)) {
      result[result.length - 1] += ', ' + trimmed
    } else {
      result.push(trimmed)
    }
  }

  return result
}

export function splitArtists(artistStr: string): string[] {
  if (!artistStr) return []

  // Normalize feature-style delimiters to semicolons
  let normalized = artistStr
    .replace(/\s+featuring\s+/gi, ' ; ')
    .replace(/\s+feat\.?\s+/gi, ' ; ')
    .replace(/\s+ft\.?\s+/gi, ' ; ')

  // Also normalize " & " to semicolons
  normalized = normalized.replace(/\s+&\s+/g, ' ; ')

  // Split on unambiguous delimiters: ; and /
  const parts = normalized.split(/\s*[;/]\s*/)

  // For each part, try smart comma splitting
  const result: string[] = []
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    if (trimmed.includes(', ')) {
      result.push(...smartCommaSplit(trimmed))
    } else {
      result.push(trimmed)
    }
  }

  return result.filter(s => s.length > 0)
}
