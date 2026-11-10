import { useEffect, useRef, useState } from 'react'

const reduced = () => document.documentElement.dataset.motion === 'off'

/** Counts from the previous value up (or down) to `target`, easing out. */
export function useCountUp(target, duration = 1100, delay = 0) {
  const [value, setValue] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    let raf
    if (reduced()) {
      from.current = target
      raf = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(raf)
    }
    let start
    const a = from.current
    const tick = (t) => {
      start ??= t + delay
      const p = Math.min(1, Math.max(0, (t - start) / duration))
      const e = 1 - Math.pow(1 - p, 3)
      const v = a + (target - a) * e
      from.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])

  return value
}

/** Calls `onAway` for a pointerdown outside `ref` or an Escape press, while `active`. */
export function useDismiss(ref, active, onAway) {
  const cb = useRef(onAway)
  useEffect(() => {
    cb.current = onAway
  })
  useEffect(() => {
    if (!active) return
    const down = (e) => ref.current && !ref.current.contains(e.target) && cb.current()
    const key = (e) => e.key === 'Escape' && cb.current()
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [ref, active])
}
