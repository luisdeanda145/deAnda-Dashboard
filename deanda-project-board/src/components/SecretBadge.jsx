import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PAD, cornerSize } from '../lib/corner'

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
    const fit = () => setSize(cornerSize())
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
      <button type="button" className="secret-spot" aria-hidden="true" tabIndex={-1} style={{ width: size + PAD, height: size + PAD, left: 0, top: 0 }} onClick={() => setShown((s) => !s)} />
    </>,
    document.body,
  )
}
