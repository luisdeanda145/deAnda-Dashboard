import { useRef, useState } from 'react'
import Icon from './Icon'
import { USER } from '../data/board'
import { PAGES } from '../data/pages'
import { useDismiss } from '../lib/hooks'
import { isOpen } from '../lib/selectors'
import { useApp } from '../lib/store'
import { play } from '../lib/sound'

/* the four pages that get their own tab; everything else lives under More */
const MAIN = ['overview', 'mine', 'board', 'tasks']
const SHORT = { tasks: 'Tasks' }

/**
 * Bottom tab bar for phones, like an iOS app. Hidden by CSS on anything wider
 * than a phone (see styles/phone.css), so the desktop layout never sees it.
 */
export default function PhoneTabs() {
  const { page, go, tasks, unread } = useApp()
  const [more, setMore] = useState(false)
  const ref = useRef(null)
  useDismiss(ref, more, () => setMore(false))

  const badges = {
    mine: tasks.filter((t) => t.owner === USER.name && isOpen(t)).length,
    board: tasks.filter((t) => t.status === 'Blocked').length,
  }
  const main = PAGES.filter((p) => MAIN.includes(p.id))
  const rest = PAGES.filter((p) => !MAIN.includes(p.id))
  const inMore = rest.some((p) => p.id === page)
  const open = (id) => {
    setMore(false)
    if (id !== page) play('tab')
    go(id)
  }

  return (
    <nav className="phone-tabs" aria-label="Pages" ref={ref}>
      {more && (
        <div className="phone-more" role="menu">
          {rest.map((p) => (
            <button type="button" role="menuitem" key={p.id} className={p.id === page ? 'on' : ''} onClick={() => open(p.id)}>
              <Icon name={p.icon} size={20} />
              {p.label}
            </button>
          ))}
        </div>
      )}
      {main.map((p) => (
        <button type="button" key={p.id} className={`pt-item${p.id === page ? ' on' : ''}`} aria-current={p.id === page ? 'page' : undefined} onClick={() => open(p.id)}>
          <span className="pt-ic">
            <Icon name={p.icon} size={22} />
            {p.id === 'mine' && unread > 0 ? (
              <b className="msg">{unread}</b>
            ) : (
              badges[p.id] > 0 && <b className={p.id === 'board' ? 'warn' : ''}>{badges[p.id]}</b>
            )}
          </span>
          {SHORT[p.id] || p.label}
        </button>
      ))}
      <button type="button" className={`pt-item${inMore || more ? ' on' : ''}`} aria-expanded={more} onClick={() => setMore((m) => !m)}>
        <span className="pt-ic">
          <Icon name="dots" size={22} />
        </span>
        More
      </button>
    </nav>
  )
}
