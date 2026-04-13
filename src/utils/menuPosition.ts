/**
 * Compute a `fixed`-position style for a submenu (or any panel that opens
 * beside a trigger element).
 *
 * Vertical strategy: align the submenu's top edge with the trigger's top edge.
 * If the trigger is close enough to the bottom that this would clip the menu,
 * flip to `bottom` anchoring (pin the submenu's bottom to the trigger's bottom
 * and let it grow upward) — no height estimate required.
 *
 * Horizontal strategy: open to the right of the trigger; flip left if no room.
 *
 * @param rect        Bounding rect of the trigger element
 * @param subW        Submenu width in px
 * @param estSubH     Estimated height — only used to decide direction, not position
 */
export function subMenuPosition(
  rect: DOMRect,
  subW: number,
  estSubH = 260,
): Record<string, string> {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const margin = 6

  // ── Horizontal ────────────────────────────────────────────────────────────
  const spaceRight = vw - rect.right
  const left = spaceRight >= subW + margin
    ? rect.right + 4
    : rect.left - subW - 4

  // ── Vertical ──────────────────────────────────────────────────────────────
  const spaceBelow = vh - rect.top - margin
  const spaceAbove = rect.bottom - margin

  if (spaceBelow >= Math.min(estSubH, 120) || spaceBelow >= spaceAbove) {
    return {
      top: Math.max(margin, rect.top) + 'px',
      left: Math.max(margin, left) + 'px',
      maxHeight: Math.max(60, spaceBelow) + 'px',
      overflowY: 'auto',
    }
  } else {
    // Anchor bottom of submenu to bottom of trigger — grows upward naturally
    return {
      bottom: Math.max(margin, vh - rect.bottom) + 'px',
      left: Math.max(margin, left) + 'px',
      maxHeight: Math.max(60, spaceAbove) + 'px',
      overflowY: 'auto',
    }
  }
}

/**
 * Compute a `fixed`-position style for a context menu so it is never clipped
 * by the viewport edges.
 *
 * Strategy:
 *  - Horizontally: open to the right of the click; flip left if insufficient space.
 *  - Vertically:   open downward from the click when there is enough room below;
 *                  otherwise anchor the menu's BOTTOM edge to the click point so
 *                  it grows upward. Using `bottom` (instead of a computed `top`)
 *                  means we never need to estimate the actual menu height — the
 *                  browser handles it and the menu always sits flush with the cursor.
 *
 * @param x        Click / trigger X in viewport coordinates
 * @param y        Click / trigger Y in viewport coordinates
 * @param menuW    Approximate menu width in px (used for horizontal clamp only)
 * @param estMenuH Minimum space-below threshold for deciding the open direction.
 *                 Does NOT affect vertical position when flipping upward.
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

  if (spaceBelow >= Math.min(estMenuH, 160) || spaceBelow >= spaceAbove) {
    // Open downward — anchor top to click point
    return {
      top: Math.max(margin, y) + 'px',
      left: left + 'px',
      maxHeight: Math.max(60, spaceBelow) + 'px',
      overflowY: 'auto',
    }
  } else {
    // Open upward — anchor bottom to click point.
    // `bottom` = distance from viewport bottom to the click point.
    // The menu grows upward from there; no height estimate needed.
    return {
      bottom: Math.max(margin, vh - y) + 'px',
      left: left + 'px',
      maxHeight: Math.max(60, spaceAbove) + 'px',
      overflowY: 'auto',
    }
  }
}
