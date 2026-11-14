import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const TEXT = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]), textarea, [contenteditable="true"]'
const CLICKABLE = 'a, button, [role="button"], [role="menuitem"], [role="option"], select, label, summary, .chip, .seg button, .tcard, .task, .deal'
const EASE = 0.3 // how far the ring closes on the pointer each frame

/**
 * The custom cursor: a glowing sky-blue ring with two bright arcs that slowly
 * turn, around a small white dot. The dot sits exactly on the pointer; the ring
 * glides after it, grows a little over anything clickable and tightens on a click.
 * Text fields keep the normal I-beam. Mouse and trackpad only (never on touch).
 */
export default function Cursor() {
  const dot = useRef(null)
  const ring = useRef(null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('custom-cursor')
    const pos = { x: -100, y: -100 }
    const at = { x: -100, y: -100 }
    let raf = 0
    let shown = false
    let idle = 0

    const glide = () => {
      const still = root.dataset.motion === 'off'
      at.x = still ? pos.x : at.x + (pos.x - at.x) * EASE
      at.y = still ? pos.y : at.y + (pos.y - at.y) * EASE
      ring.current.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`
      /* keep going only while the ring is catching up: nothing runs when the mouse is still */
      raf = Math.abs(pos.x - at.x) + Math.abs(pos.y - at.y) > 0.3 ? requestAnimationFrame(glide) : 0
    }
    const show = (on) => {
      if (on === shown) return
      shown = on
      root.classList.toggle('cursor-on', on)
    }
    const move = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      pos.x = e.clientX
      pos.y = e.clientY
      if (!shown) {
        at.x = pos.x
        at.y = pos.y
      }
      dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
      const t = e.target instanceof Element ? e.target : null
      root.classList.toggle('cursor-text', !!t?.closest(TEXT))
      root.classList.toggle('cursor-hover', !!t?.closest(CLICKABLE))
      show(true)
      if (!raf) raf = requestAnimationFrame(glide)
      /* the arcs turn while the mouse moves and rest a moment after it stops */
      root.classList.remove('cursor-idle')
      clearTimeout(idle)
      idle = setTimeout(() => root.classList.add('cursor-idle'), 1500)
    }
    const down = () => root.classList.add('cursor-down')
    const up = () => root.classList.remove('cursor-down')
    const leave = (e) => !e.relatedTarget && show(false)

    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', down, { passive: true })
    addEventListener('pointerup', up, { passive: true })
    document.addEventListener('pointerout', leave)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(idle)
      removeEventListener('pointermove', move)
      removeEventListener('pointerdown', down)
      removeEventListener('pointerup', up)
      document.removeEventListener('pointerout', leave)
      root.classList.remove('custom-cursor', 'cursor-on', 'cursor-text', 'cursor-hover', 'cursor-down', 'cursor-idle')
    }
  }, [])

  return createPortal(
    <>
      <div ref={ring} className="cur-ring" aria-hidden="true">
        <i />
      </div>
      <div ref={dot} className="cur-dot" aria-hidden="true">
        <i />
      </div>
    </>,
    document.body,
  )
}
