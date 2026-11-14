import { useEffect, useRef } from 'react'
import { frameLoop } from '../lib/frameLoop'

/* Snow for the Christmas room, drawn on one canvas behind the dashboard's windows.
   Three depths of flakes: far ones are tiny, faint and slow; near ones are larger,
   softer and quicker, so the room reads as deep. Each flake sways on its own
   rhythm, and a slow gust now and then leans the whole fall sideways. */
const FPS = 24
const SCALE = 0.6 // canvas pixels per screen point: flakes are soft dots, mostly seen through frosted glass, so a small canvas looks the same and costs far less

/** A soft round flake, drawn once and stamped for every flake. */
function sprite() {
  const s = document.createElement('canvas')
  s.width = s.height = 64
  const g = s.getContext('2d')
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.85)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return s
}

function flake(w, h, anywhere) {
  const z = Math.random() ** 1.8 // most flakes far away, a few close
  return {
    z,
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : -10 - Math.random() * 40,
    r: 1 + z * 4.5, // radius in css px
    fall: 14 + z * 52, // px per second
    sway: 4 + z * 16, // px
    freq: 0.15 + Math.random() * 0.35, // sways per second
    phase: Math.random() * Math.PI * 2,
    alpha: 0.28 + z * 0.5,
  }
}

export default function Snow() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const dot = sprite()
    let w = 0
    let h = 0
    let k = 1
    let flakes = []
    const size = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      k = SCALE
      canvas.width = Math.round(w * k)
      canvas.height = Math.round(h * k)
      /* fewer flakes on small screens */
      const count = Math.round(Math.min(170, Math.max(45, (w * h) / 9000)))
      flakes = Array.from({ length: count }, () => flake(w, h, true))
    }
    size()
    addEventListener('resize', size)

    let last = 0
    const stop = frameLoop(canvas, FPS, (sec) => {
      const dt = Math.min(0.1, Math.max(0, sec - last))
      last = sec
      /* a slow gust that leans the fall one way, then the other */
      const wind = Math.sin(sec * 0.07) * 14 + Math.sin(sec * 0.023 + 1.3) * 8
      ctx.setTransform(k, 0, 0, k, 0, 0)
      ctx.clearRect(0, 0, w, h)
      for (const f of flakes) {
        f.y += f.fall * dt
        f.x += wind * (0.4 + f.z) * dt
        if (f.y - f.r > h) Object.assign(f, flake(w, h, false))
        if (f.x < -20) f.x += w + 40
        else if (f.x > w + 20) f.x -= w + 40
        const x = f.x + Math.sin(sec * f.freq * Math.PI * 2 + f.phase) * f.sway
        const d = f.r * 2
        ctx.globalAlpha = f.alpha
        ctx.drawImage(dot, x - f.r, f.y - f.r, d, d)
      }
      ctx.globalAlpha = 1
    })
    return () => {
      stop()
      removeEventListener('resize', size)
    }
  }, [])

  return <canvas ref={ref} className="env-snow" aria-hidden="true" />
}
