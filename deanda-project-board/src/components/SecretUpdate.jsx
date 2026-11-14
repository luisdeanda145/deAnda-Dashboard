import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PAD, cornerSize } from '../lib/corner'

/**
 * An invisible spot in a bottom corner, the same size as the badge spot in the
 * top-left. Bottom-left brings back the current update pop-up; bottom-right
 * cycles the season previews.
 */
export default function SecretUpdate({ onOpen, side = 'left' }) {
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
  return createPortal(
    <button type="button" className="secret-spot" aria-hidden="true" tabIndex={-1} style={{ width: size + PAD, height: size + PAD, [side]: 0, bottom: 0 }} onClick={onOpen} />,
    document.body,
  )
}
