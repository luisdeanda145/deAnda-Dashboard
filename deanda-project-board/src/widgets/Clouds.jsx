import { useEffect, useRef } from 'react'
import { frameLoop } from '../lib/frameLoop'

/* Seven soft clouds of colour that wander, swirl and stretch like powder in water.
   Each has three motions on separate loops that never line up:
     path: a wandering route through p1…p4 (fractions of its own size), over `dt` seconds
     o, ot, rev: a slow swirl around an off-centre point, one turn per `ot` seconds
     sx, sy, bt: a stretch to (sx, sy) and back, `bt` seconds each way
   x, y, w, h place and size it as fractions of the card. */
const CLOUDS = [
  { w: 0.78, h: 0.58, x: -0.22, y: -0.24, path: [[0.18, 0.1], [0.34, 0.32], [0.08, 0.44], [-0.06, 0.18]], dt: 10.5, o: [0.7, 1.2], ot: 23, rev: false, sx: 1.3, sy: 0.8, bt: 5.5 },
  { w: 0.64, h: 0.5, x: 0.48, y: 0.08, path: [[-0.26, 0.14], [-0.4, -0.12], [-0.12, -0.26], [0.06, 0.08]], dt: 8.5, o: [-0.2, 0.5], ot: 29, rev: true, sx: 0.8, sy: 1.3, bt: 4.5 },
  { w: 0.9, h: 0.46, x: -0.1, y: 0.64, path: [[0.16, -0.1], [-0.08, -0.24], [0.22, -0.06], [0.04, 0.06]], dt: 13, o: [0.5, -0.6], ot: 32, rev: false, sx: 1.2, sy: 0.85, bt: 6.5 },
  { w: 0.46, h: 0.4, x: 0.2, y: 0.28, path: [[0.4, -0.2], [0.64, 0.18], [0.2, 0.4], [-0.18, 0.12]], dt: 9.5, o: [1.2, 0.3], ot: 19, rev: true, sx: 1.4, sy: 0.75, bt: 4 },
  { w: 0.52, h: 0.44, x: 0.58, y: 0.58, path: [[-0.3, -0.3], [-0.6, -0.08], [-0.36, 0.14], [-0.08, -0.14]], dt: 11.5, o: [-0.4, -0.2], ot: 26, rev: false, sx: 0.85, sy: 1.25, bt: 5 },
  { w: 0.38, h: 0.34, x: -0.06, y: 0.34, path: [[0.5, 0.2], [0.9, -0.1], [0.6, -0.4], [0.2, -0.16]], dt: 7.5, o: [1.5, 0.6], ot: 17, rev: false, sx: 1.35, sy: 0.9, bt: 3.5 },
  { w: 0.58, h: 0.42, x: 0.3, y: -0.18, path: [[-0.2, 0.3], [0.1, 0.56], [0.34, 0.26], [0.12, -0.06]], dt: 14, o: [0.5, 1.6], ot: 35, rev: true, sx: 1.15, sy: 1.3, bt: 6 },
]
/* colour and opacity per cloud: light blue normally, warm reds at Christmas */
const PALETTES = {
  default: [[240, 250, 255, 0.78], [150, 238, 255, 0.7], [52, 84, 222, 0.55], [205, 236, 255, 0.62], [120, 205, 255, 0.6], [230, 247, 255, 0.55], [170, 225, 255, 0.5]],
  christmas: [[255, 236, 238, 0.7], [255, 150, 160, 0.6], [90, 4, 20, 0.6], [255, 210, 215, 0.55], [240, 110, 125, 0.55], [255, 240, 225, 0.5], [255, 190, 170, 0.45]],
}
const STOPS = [0, 0.2, 0.45, 0.7, 0.88, 1] // where the path's points fall in its loop

/* CSS ease-in-out, cubic-bezier(0.42, 0, 0.58, 1) */
function ease(x) {
  let t = x
  for (let i = 0; i < 6; i++) {
    const xt = 3 * (1 - t) * (1 - t) * t * 0.42 + 3 * (1 - t) * t * t * 0.58 + t * t * t - x
    const d = 3 * (1 - t) * (1 - t) * 0.42 + 6 * (1 - t) * t * (0.58 - 0.42) + 3 * t * t * (1 - 0.58)
    if (Math.abs(xt) < 1e-4 || !d) break
    t -= xt / d
  }
  return t * t * (3 - 2 * t)
}
function wander(path, dt, sec) {
  const pts = [[0, 0], ...path, [0, 0]]
  const f = (sec % dt) / dt
  let i = 0
  while (f > STOPS[i + 1]) i++
  const k = ease((f - STOPS[i]) / (STOPS[i + 1] - STOPS[i]))
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]
}

const SCALE = 0.4 // the clouds are soft blurs: a small canvas, stretched, looks the same

/** The Hours Logged card's moving sky, drawn on one small canvas 24 times a second. */
export default function Clouds() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let W = 0
    let H = 0
    const size = () => {
      W = Math.max(1, Math.round(canvas.clientWidth * SCALE))
      H = Math.max(1, Math.round(canvas.clientHeight * SCALE))
      canvas.width = W
      canvas.height = H
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(canvas)

    const stop = frameLoop(canvas, 24, (sec) => {
      const pal = PALETTES[document.documentElement.dataset.season] || PALETTES.default
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, W, H)
      CLOUDS.forEach((c, i) => {
        const [r, g, b, a] = pal[i]
        const w = c.w * W
        const h = c.h * H
        const left = c.x * W
        const top = c.y * H
        const [px, py] = wander(c.path, c.dt, sec)
        const turn = ((sec % c.ot) / c.ot) * Math.PI * 2 * (c.rev ? -1 : 1)
        const p = (sec % (2 * c.bt)) / c.bt
        const s = ease(p < 1 ? p : 2 - p)
        /* as in CSS: around the origin point, move, then turn, then stretch */
        const ox = left + c.o[0] * w
        const oy = top + c.o[1] * h
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.translate(ox + px * w, oy + py * h)
        ctx.rotate(turn)
        ctx.scale(1 + (c.sx - 1) * s, 1 + (c.sy - 1) * s)
        ctx.translate(left + w / 2 - ox, top + h / 2 - oy)
        ctx.scale(w / 2, h / 2)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        grad.addColorStop(0, `rgba(${r},${g},${b},${a})`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(0, 0, 1, 0, Math.PI * 2)
        ctx.fill()
      })
    })
    return () => {
      stop()
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} className="clouds" />
}
