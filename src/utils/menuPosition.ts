/**
 * Compute a `fixed`-position style for a context menu so it is never clipped
 * by the viewport edges.
 *
 * Strategy:
 *  - Horizontally: open to the right of the click; flip left if insufficient space.
 *  - Vertically:   open downward from the click; flip upward if insufficient space.
 *  - Always add `maxHeight` so a very tall menu scrolls rather than clips.
 *
 * @param x         Click / trigger X in viewport coordinates
 * @param y         Click / trigger Y in viewport coordinates
 * @param menuW     Approximate menu width in px (used for horizontal clamp)
 * @param estMenuH  Estimated menu height used to decide whether to flip vertically.
 *                  When flipping up we use this value; the real max is always clamped.
 */
export function menuPosition(
  x: number,
  y: number,
  menuW = 208,
  estMenuH = 320,
): Record<string, string> {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const margin = 6

  // ── Horizontal ──────────────────────────────────────────────────────────
  const left = x + menuW + margin > vw
    ? Math.max(margin, vw - menuW - margin)
    : x

  // ── Vertical ────────────────────────────────────────────────────────────
  const spaceBelow = vh - y - margin
  const spaceAbove = y - margin

  let top: number
  let maxHeight: number

  if (spaceBelow >= Math.min(estMenuH, 160) || spaceBelow >= spaceAbove) {
    // Open downward
    top = y
    maxHeight = spaceBelow
  } else {
    // Flip upward — anchor bottom of menu to click point
    const clampedH = Math.min(estMenuH, spaceAbove)
    top = y - clampedH
    maxHeight = spaceAbove
  }

  top = Math.max(margin, top)
  maxHeight = Math.max(60, maxHeight)

  return {
    top: top + 'px',
    left: left + 'px',
    maxHeight: maxHeight + 'px',
    overflowY: 'auto',
  }
}
