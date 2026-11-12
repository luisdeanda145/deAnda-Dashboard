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
 * A hidden extra: an invisible spot in the top-left corner of the screen, exactly
 * where the badge appears and the same size. Click it and the badge shows there,
 * sized so it never covers the dashboard; click it again to hide it. Where there's
 * no room (e.g. on a phone) there's no spot and no badge.
 */
export default function SecretBadge() {
  const [shown, setShown] = useState(false)
  const [size, setSize] = useState(0)

  useEffect(() => {
    const fit = () => setSize(room())
    const first = requestAnimationFrame(fit)
    const settled = setTimeout(fit, 2200) // again once the windows have finished settling in
    addEventListener('resize', fit)
    return () => {
      cancelAnimationFrame(first)
      clearTimeout(settled)
      removeEventListener('resize', fit)
    }
  }, [])

  if (size < 28) return null
  const box = { width: size, height: size, left: PAD, top: PAD }
  return createPortal(
    <>
      {shown && <img className="secret-badge" src="/badge.svg" alt="" style={box} />}
      <button type="button" className="secret-spot" aria-hidden="true" tabIndex={-1} style={box} onClick={() => setShown((s) => !s)} />
    </>,
    document.body,
  )
}
