import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const PAD = 14 // gap from the screen edge
const GAP = 12 // gap kept from every window
const MAX = 96

/** The biggest square that fits at the top-left corner without touching any window. */
function room() {
  const rects = [...document.querySelectorAll('.space > .side, .space > .main, .space > .right, .space > .grabber')].map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.height)
  /* a square [PAD, PAD + s] stays clear of a window if it ends before the window's left or top edge */
  const fits = rects.map((r) => Math.max(r.left, r.top) - PAD - GAP)
  return Math.min(MAX, ...fits)
}

/**
 * A hidden extra: a tiny invisible spot in the very top-left corner of the screen.
 * Click it and the badge appears in that corner, sized so it never covers the
 * dashboard (where there's no room, e.g. on a phone, it stays hidden). Click again to hide it.
 */
export default function SecretBadge() {
  const [shown, setShown] = useState(false)
  const [size, setSize] = useState(0)

  useEffect(() => {
    if (!shown) return
    const fit = () => setSize(room())
    fit()
    const id = setTimeout(fit, 900) // again once the windows have finished settling in
    addEventListener('resize', fit)
    return () => {
      clearTimeout(id)
      removeEventListener('resize', fit)
    }
  }, [shown])

  return createPortal(
    <>
      <button type="button" className="secret-spot" aria-hidden="true" tabIndex={-1} onClick={() => setShown((s) => !s)} />
      {shown && size >= 28 && <img className="secret-badge" src="/badge.svg" alt="" style={{ width: size, height: size, left: PAD, top: PAD }} />}
    </>,
    document.body,
  )
}
