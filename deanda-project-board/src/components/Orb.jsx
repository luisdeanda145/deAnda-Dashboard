import { useEffect, useRef } from 'react'
import { MODE_DRAWS, resolvePreset } from 'thinking-orbs/engine'
import { frameLoop } from '../lib/frameLoop'

/**
 * A thinking-orbs orb drawn at a capped frame rate (the package's own component
 * always redraws 60 times a second). Same drawing code, light dots for dark glass.
 */
export default function Orb({ state = 'composing', size = 64, fps = 30, className }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const dpr = Math.min(2, devicePixelRatio || 1)
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    const ctx = canvas.getContext('2d')
    const { mode, speed, opts } = resolvePreset(state, size)
    const draw = MODE_DRAWS[mode]
    return frameLoop(canvas, fps, (sec) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)
      draw(ctx, size, sec * speed, true, opts)
    })
  }, [state, size, fps])

  return <canvas ref={ref} className={className} aria-hidden="true" style={{ width: size, height: size, display: 'block' }} />
}
