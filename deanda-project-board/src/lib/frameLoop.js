/* A frame loop capped at a set rate, for canvas animations that look the same at
   a lower rate (slow, soft motion). It stops while the canvas is off screen or
   the tab is hidden, and draws a single still frame when motion is off. */

const motionOff = () =>
  document.documentElement.dataset.motion === 'off' || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)

/** Calls draw(seconds) up to `fps` times a second; returns a stop function. */
export function frameLoop(canvas, fps, draw) {
  const step = 1000 / fps
  const t0 = performance.now()
  let raf = 0
  let last = -Infinity
  let running = false
  let visible = true

  const tick = (now) => {
    raf = requestAnimationFrame(tick)
    if (now - last < step - 1) return
    last = now
    draw((now - t0) / 1000)
  }
  const start = () => {
    if (running || motionOff()) return
    running = true
    raf = requestAnimationFrame(tick)
  }
  const stop = () => {
    running = false
    cancelAnimationFrame(raf)
  }

  draw(motionOff() ? 0.6 : 0) // always paint once
  const io =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([e]) => {
          visible = e.isIntersecting
          if (visible && !document.hidden) start()
          else stop()
        })
      : null
  if (io) io.observe(canvas)
  else start()
  const onVis = () => (document.hidden ? stop() : visible && start())
  document.addEventListener('visibilitychange', onVis)
  /* the Animations setting can be switched while it runs */
  const mo = new MutationObserver(() => {
    if (motionOff()) {
      stop()
      draw(0.6)
    } else if (visible && !document.hidden) start()
  })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })

  return () => {
    stop()
    io?.disconnect()
    mo.disconnect()
    document.removeEventListener('visibilitychange', onVis)
  }
}
