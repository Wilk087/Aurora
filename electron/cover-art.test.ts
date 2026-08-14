import { describe, it, expect } from 'vitest'
import { isPictureComplete, needsFullParse } from './cover-art'

const jpeg = (complete: boolean) =>
  new Uint8Array(complete ? [0xff, 0xd8, 0x11, 0x22, 0xff, 0xd9] : [0xff, 0xd8, 0x11, 0x22, 0x92, 0x70])

const png = (complete: boolean) =>
  new Uint8Array(
    complete
      ? [0x89, 0x50, 0x4e, 0x47, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]
      : [0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08],
  )

describe('isPictureComplete', () => {
  it('accepts a JPEG ending in the EOI marker', () => {
    expect(isPictureComplete({ format: 'image/jpeg', data: jpeg(true) })).toBe(true)
  })

  it('rejects a JPEG with no EOI marker', () => {
    expect(isPictureComplete({ format: 'image/jpeg', data: jpeg(false) })).toBe(false)
  })

  it('accepts a PNG ending in the IEND chunk', () => {
    expect(isPictureComplete({ format: 'image/png', data: png(true) })).toBe(true)
  })

  it('rejects a PNG with no IEND chunk', () => {
    expect(isPictureComplete({ format: 'image/png', data: png(false) })).toBe(false)
  })

  it('is case-insensitive about the mime type', () => {
    expect(isPictureComplete({ format: 'IMAGE/JPEG', data: jpeg(false) })).toBe(false)
  })

  // Never trigger an expensive re-parse for a format we cannot verify.
  it('assumes formats it cannot check are complete', () => {
    expect(isPictureComplete({ format: 'image/webp', data: new Uint8Array([1, 2, 3]) })).toBe(true)
    expect(isPictureComplete({ format: undefined, data: new Uint8Array([1, 2, 3]) })).toBe(true)
  })

  it('treats a missing or empty picture as nothing to check', () => {
    expect(isPictureComplete(undefined)).toBe(true)
    expect(isPictureComplete(null)).toBe(true)
    expect(isPictureComplete({ format: 'image/jpeg', data: new Uint8Array() })).toBe(true)
  })

  it('does not read out of bounds on data shorter than the marker', () => {
    expect(isPictureComplete({ format: 'image/png', data: new Uint8Array([0x89]) })).toBe(false)
    expect(isPictureComplete({ format: 'image/jpeg', data: new Uint8Array([0xff]) })).toBe(false)
  })
})

describe('needsFullParse', () => {
  // Both symptoms of music-metadata's early exit on multi-page Ogg headers.
  it('retries when duration is missing', () => {
    expect(needsFullParse(undefined, { format: 'image/jpeg', data: jpeg(true) })).toBe(true)
    expect(needsFullParse(NaN, null)).toBe(true)
  })

  it('retries when the picture is truncated', () => {
    expect(needsFullParse(288.014, { format: 'image/jpeg', data: jpeg(false) })).toBe(true)
  })

  it('does not retry when duration and picture both look right', () => {
    expect(needsFullParse(288.014, { format: 'image/jpeg', data: jpeg(true) })).toBe(false)
  })

  it('does not retry a track with no cover as long as it has a duration', () => {
    expect(needsFullParse(180, null)).toBe(false)
  })

  // A zero-length track is legitimate for some formats; only undefined means
  // the parser stopped early.
  it('does not retry on a genuine zero duration', () => {
    expect(needsFullParse(0, null)).toBe(false)
  })
})
