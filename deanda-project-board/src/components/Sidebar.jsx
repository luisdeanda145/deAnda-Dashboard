import { useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { Avatar } from './ui'
import { USER, WORKSPACE } from '../data/board'
import { PAGES } from '../data/pages'
import { daysInMonth, fmtMonth, shortMonth } from '../lib/format'
import { isOpen, shiftMonth } from '../lib/selectors'
import { useApp } from '../lib/store'
import { play } from '../lib/sound'

/** The bent-back left panel of the main window: workspace and navigation. */
export default function Sidebar() {
  const { page, go, tasks, openTask, month, today, unread } = useApp()
  const dayN = Number(today.slice(8, 10))
  const days = daysInMonth(month)
  const nav = useRef(null)
  const [ind, setInd] = useState(null)

  /* live badges: my open tasks and the team's blocked count */
  const badges = {
    mine: tasks.filter((t) => t.owner === USER.name && isOpen(t)).length,
    board: tasks.filter((t) => t.status === 'Blocked').length,
  }

  useLayoutEffect(() => {
    const place = () => {
      const btn = nav.current?.querySelector(`[data-id="${page}"]`)
      if (btn) setInd({ y: btn.offsetTop, h: btn.offsetHeight })
    }
    place()
    addEventListener('resize', place)
    return () => removeEventListener('resize', place)
  }, [page])

  const item = (p, i) => (
    <button
      type="button"
      key={p.id}
      data-id={p.id}
      className={`nav-item${p.id === page ? ' on' : ''}`}
      style={{ '--i': i }}
      aria-current={p.id === page ? 'page' : undefined}
      onClick={() => {
        if (p.id !== page) play('tab')
        go(p.id)
      }}
    >
      <Icon name={p.icon} size={21} />
      <span>{p.label}</span>
      {p.id === 'mine' && unread > 0 && (
        <b className="badge msg-badge" title={`${unread} unread message${unread === 1 ? '' : 's'}`}>
          <Icon name="chat" size={11} stroke={2.4} />
          {unread}
        </b>
      )}
      {badges[p.id] > 0 && !(p.id === 'mine' && unread > 0) && (
        <b className={`badge${p.id === 'board' ? ' warn' : ''}`} title={p.id === 'board' ? 'Blocked tasks' : 'Your open tasks'}>
          {badges[p.id]}
        </b>
      )}
    </button>
  )

  return (
    <nav className="win side" aria-label="Main">
      <div className="ws">
        <span className="ws-logo" aria-hidden="true">
          <img src="/logo.webp" alt="" />
        </span>
        <div>
          <strong>{WORKSPACE.name}</strong>
          <span>{WORKSPACE.sub}</span>
        </div>
      </div>

      <button type="button" className="new-task" aria-label="New task" onClick={() => openTask()}>
        <Icon name="plus" size={18} stroke={2.2} />
        <span className="nt-label">New task</span>
        <kbd>N</kbd>
      </button>

      <button type="button" className="month-tile" onClick={() => go('insights')} title="Every page shows this month only. Past months are in Insights.">
        <span className="mt-ic">
          <Icon name="calendar" size={18} />
        </span>
        <span className="mt-body">
          <b>{fmtMonth(month)}</b>
          <small>
            Day {dayN} of {days} · resets {shortMonth(shiftMonth(month, 1))} 1
          </small>
        </span>
        <i className="mt-bar" aria-hidden="true">
          <i style={{ width: `${(dayN / days) * 100}%` }} />
        </i>
      </button>

      <div className="nav" ref={nav}>
        {ind && <i className="nav-ind" style={{ transform: `translateY(${ind.y}px)`, height: ind.h }} />}
        <div className="nav-group">{PAGES.filter((p) => !p.low).map(item)}</div>
        <div className="nav-group low">
          {PAGES.filter((p) => p.low).map((p, i) => item(p, i + 10))}
          <div className="side-me">
            <Avatar person={USER.name} size={34} status="online" />
            <div>
              <b>{USER.name}</b>
              <small>{USER.role}</small>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
