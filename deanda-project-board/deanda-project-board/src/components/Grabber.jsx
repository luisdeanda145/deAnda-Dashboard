import { useRef } from 'react'
import { useApp } from '../lib/store'

/** The visionOS window bar. Drag it sideways to bend the glass; the dot re-centres it. */
export default function Grabber() {
  const { settings, set, toast } = useApp()
  const drag = useRef(null)

  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, curve: settings.curve }
    document.documentElement.classList.add('bending')
  }
  const move = (e) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    set({ curve: Math.round(Math.min(28, Math.max(0, drag.current.curve + dx / 8))) })
  }
  const up = () => {
    drag.current = null
    document.documentElement.classList.remove('bending')
  }

  return (
    <div className="grabber">
      <button
        type="button"
        className="g-dot"
        aria-label="Recenter windows"
        data-tip="Recenter"
        onClick={() => {
          set({ curve: 16, depth: 1700 })
          toast({ icon: 'cube', title: 'Recentered', text: 'Windows are back in front of you' })
        }}
      />
      <button
        type="button"
        className="g-bar"
        aria-label={`Window bar — drag to bend (${settings.curve}°)`}
        data-tip={`Drag to bend · ${settings.curve}°`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDoubleClick={() => set({ curve: 16 })}
      />
    </div>
  )
}
