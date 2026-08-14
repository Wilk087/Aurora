/**
 * Embedded cover art integrity checks.
 *
 * music-metadata stops reading an Ogg stream as soon as it believes it has the
 * tags. When a file's comment header spans many pages — which is exactly what
 * happens when a large cover is embedded — it gives up partway through and
 * returns a truncated picture, with format.duration left undefined.
 *
 * Observed on music-metadata 11.14.0 with an Ogg Opus file carrying a 76160
 * byte JPEG: the default parse returns 38869 bytes and no duration, while
 * parsing the same file with { duration: true } returns all 76160 bytes.
 *
 * A truncated JPEG still decodes — the browser renders however many rows it
 * received and leaves the rest blank — so this fails silently and ends up
 * cached that way.
 */

export interface EmbeddedPicture {
  format?: string
  data: Uint8Array
}

function endsWith(data: Uint8Array, marker: readonly number[]): boolean {
  if (data.length < marker.length) return false
  const offset = data.length - marker.length
  return marker.every((byte, i) => data[offset + i] === byte)
}

/** JPEG end-of-image marker. */
const JPEG_EOI = [0xff, 0xd9] as const

/** Final 8 bytes of a PNG IEND chunk (length+type+CRC are all fixed). */
const PNG_IEND = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82] as const

/**
 * Whether an embedded picture looks like it was read in full.
 *
 * Only JPEG and PNG can be checked cheaply and reliably. Anything else is
 * assumed complete rather than triggering a needless slow re-parse.
 */
export function isPictureComplete(pic?: EmbeddedPicture | null): boolean {
  if (!pic || !pic.data || pic.data.length === 0) return true

  const format = (pic.format ?? '').toLowerCase()

  if (format.includes('jpeg') || format.includes('jpg')) {
    return endsWith(pic.data, JPEG_EOI)
  }
  if (format.includes('png')) {
    return endsWith(pic.data, PNG_IEND)
  }
  return true
}

/**
 * Whether the fast metadata parse came back short and should be retried with
 * { duration: true }, which forces music-metadata to keep reading.
 *
 * A missing duration is the other symptom of the same early exit, so it is
 * treated as a retry trigger in its own right — otherwise Opus tracks end up
 * stored with duration 0.
 */
export function needsFullParse(
  duration: number | undefined,
  pic?: EmbeddedPicture | null,
): boolean {
  if (duration === undefined || duration === null || Number.isNaN(duration)) return true
  return !isPictureComplete(pic)
}
