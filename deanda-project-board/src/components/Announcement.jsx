import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import Orb from './Orb'
import { markAnnouncementSeen, recordAnnouncement } from '../lib/announcement'

const HOLD_MS = 1500

/**
 * A one-time note to the team, shown the first time each person opens the
 * board. It can't be dismissed by accident: the button has to be held down.
 */
export default function Announcement({ onDone }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    recordAnnouncement() // shown to them
    return () => clearTimeout(timer.current)
  }, [])

  const start = () => {
    if (timer.current) return
    setHolding(true)
    timer.current = setTimeout(() => {
      timer.current = null
      markAnnouncementSeen()
      recordAnnouncement({ acknowledged: true })
      onDone()
    }, HOLD_MS)
  }
  const stop = () => {
    clearTimeout(timer.current)
    timer.current = null
    setHolding(false)
  }

  return (
    <div className="sheet-wrap">
      <section className="sheet task-sheet announce announce-sm" role="dialog" aria-modal="true" aria-labelledby="announce-title">
        <header>
          <span className="tu-ic">
            <Icon name="sparkle" size={21} />
          </span>
          <div>
            <h2 id="announce-title">AI Assistant</h2>
            <p>An update for the team</p>
          </div>
        </header>

        <div className="an-orb" aria-hidden="true">
          <Orb state="composing" size={64} fps={30} />
        </div>

        <p className="an-lead an-center">
          Get quick summaries of the board. Pick today, the last 3 days, this week or this month, and ask what got done, what’s blocked or late, and where the hours
          went.
        </p>

        <p className="an-sign">-Luis</p>

        <footer>
          <span className="ts-rule">Press and hold to continue</span>
          <button
            type="button"
            className={`cta an-hold${holding ? ' holding' : ''}`}
            style={{ '--hold': `${HOLD_MS}ms` }}
            onPointerDown={start}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && (e.preventDefault(), start())}
            onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && stop()}
            onBlur={stop}
          >
            <i className="an-fill" />
            <span>
              <Icon name="check" size={16} stroke={2.4} /> I understand
            </span>
          </button>
        </footer>
      </section>
    </div>
  )
}
