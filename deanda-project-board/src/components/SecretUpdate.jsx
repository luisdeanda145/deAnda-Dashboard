import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PAD, cornerSize } from '../lib/corner'

/**
 * An invisible spot in the bottom-left corner, the same size as the badge spot
 * in the top-left. Click it to bring back the current update pop-up.
 */
export default function SecretUpdate({ onOpen }) {
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
    <button type="button" className="secret-spot" aria-hidden="true" tabIndex={-1} style={{ width: size, height: size, left: PAD, bottom: PAD }} onClick={onOpen} />,
    document.body,
  )
}
