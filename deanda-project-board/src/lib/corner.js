/* Hidden spots in the screen corners (SecretBadge top-left, SecretUpdate
   bottom-left, SecretSeason bottom-right). All the same size: the biggest square,
   up to MAX, that fits in all three corners without touching any window. Under 28px (e.g. on a phone)
   there's no room and no spot. */
export const PAD = 14 // gap from the screen edge
const GAP = 12 // gap kept from every window
const MAX = 96

export function cornerSize() {
  const rects = [...document.querySelectorAll('.space > .side, .space > .main, .space > .right, .space > .grabber')].map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.height)
  const H = innerHeight
  /* a square at a left corner stays clear of a window if it ends before the window's left edge,
     or (top-left) before its top edge / (bottom-left) after its bottom edge */
  const top = rects.map((r) => Math.max(r.left, r.top) - PAD - GAP)
  const bottom = rects.map((r) => Math.max(r.left, H - r.bottom) - PAD - GAP)
  const bottomRight = rects.map((r) => Math.max(innerWidth - r.right, H - r.bottom) - PAD - GAP)
  return Math.min(MAX, ...top, ...bottom, ...bottomRight)
}
