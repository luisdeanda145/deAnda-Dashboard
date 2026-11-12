import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { Avatar, Select } from './ui'
import { TEAM } from '../data/board'
import { useApp } from '../lib/store'

const MAX = 500

/** "2:41 PM" today, "Tue 2:41 PM" this week, else "Nov 3" */
function when(iso) {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  if (now - d < 6 * 86400000) return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * The small chat button in My Work's header that opens the messages card.
 * Shows your unread count on your own tab.
 */
export function MessagesButton({ open, onClick }) {
  const { me, myName, unread } = useApp()
  const count = myName && me === myName ? unread : 0
  const label = myName && me !== myName ? `Message ${me}` : 'Messages'
  return (
    <button
      type="button"
      className={`round-btn lg msg-toggle${open ? ' on' : ''}${count ? ' has-new' : ''}`}
      aria-label={count ? `${label}, ${count} unread` : label}
      aria-expanded={open}
      onClick={onClick}
    >
      <Icon name="chat" size={20} />
      {count > 0 && <b>{count}</b>}
    </button>
  )
}

/**
 * Messages on My Work. On your own tab: your latest 10, with unread ones marked
 * New (they count as read after a moment on screen), and a box to message anyone.
 * On a teammate's tab: a box to message them, and what you've sent them.
 */
export default function Messages({ onClose }) {
  const { me, messages, myName, sendMessage, markRead } = useApp()
  const mine = !!myName && me === myName
  const others = TEAM.map((p) => p.name).filter((n) => n !== myName)
  const [to, setTo] = useState(() => (mine ? others[0] : me))
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [seen, setSeen] = useState(() => new Set()) // read while you were here: stays marked New until you leave
  const box = useRef(null)

  /* on a phone the card opens below the stats: bring it into view */
  useEffect(() => {
    box.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const list = (mine ? messages.filter((m) => m.to_name === myName) : messages.filter((m) => m.to_name === me && m.from_name === myName))
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10)
  const unreadIds = mine ? list.filter((m) => !m.read_at && !String(m.id).startsWith('tmp-')).map((m) => m.id) : []
  const unreadKey = unreadIds.join(',')

  /* opening your own messages reads them, after a moment so the New marks are seen */
  useEffect(() => {
    if (!unreadKey) return
    const ids = unreadKey.split(',').map((x) => (/^\d+$/.test(x) ? Number(x) : x))
    const t = setTimeout(() => {
      setSeen((s) => new Set([...s, ...ids]))
      markRead(ids)
    }, 1500)
    return () => clearTimeout(t)
  }, [unreadKey, markRead])

  const target = mine ? to : me
  const send = async (e) => {
    e?.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    const ok = await sendMessage(target, draft)
    setSending(false)
    if (ok) setDraft('')
  }

  if (!myName) {
    return (
      <section className="card msgs rise" style={{ '--d': 5 }} ref={box}>
        <header className="msgs-head">
          <h2>
            <Icon name="chat" size={18} /> Messages
          </h2>
        <button type="button" className="round-btn msgs-close" aria-label="Close messages" onClick={onClose}>
          <Icon name="close" size={14} stroke={2} />
        </button>
        </header>
        <p className="muted-line">Messages need your sign-in to match a name on the team. Ask an admin to add you in Settings → Team.</p>
      </section>
    )
  }

  const fresh = list.filter((m) => mine && (!m.read_at || seen.has(m.id))).length
  return (
    <section className={`card msgs rise${fresh ? ' has-new' : ''}`} style={{ '--d': 5 }} ref={box}>
      <header className="msgs-head">
        <h2>
          <Icon name="chat" size={18} /> {mine ? 'Messages' : `Message ${me}`}
          {fresh > 0 && <span className="msgs-new">{fresh} new</span>}
        </h2>
        <small>{mine ? 'Your latest 10 · cleared each month' : `What you've sent ${me} this month`}</small>
        <button type="button" className="round-btn msgs-close" aria-label="Close messages" onClick={onClose}>
          <Icon name="close" size={14} stroke={2} />
        </button>
      </header>

      {list.length > 0 ? (
        <ul className="msgs-list">
          {list.map((m) => {
            const isNew = mine && (!m.read_at || seen.has(m.id))
            const who = mine ? m.from_name : `To ${m.to_name}`
            return (
              <li key={m.id} className={isNew ? 'new' : ''}>
                <Avatar person={mine ? m.from_name : m.to_name} size={28} />
                <div>
                  <span className="msgs-meta">
                    <b>{who}</b>
                    <time>{when(m.created_at)}</time>
                    {isNew && <i className="msgs-dot">New</i>}
                  </span>
                  <p>{m.body}</p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="muted-line msgs-empty">{mine ? 'No messages this month.' : `You haven't messaged ${me} this month.`}</p>
      )}

      <form className="msgs-send" onSubmit={send}>
        {mine && (
          <Select
            value={to}
            options={others}
            onChange={setTo}
            align="left"
            small
            render={(n) => (
              <span className="sel-person">
                <Avatar person={n} size={18} /> {n}
              </span>
            )}
          />
        )}
        <input
          value={draft}
          maxLength={MAX}
          placeholder={`Message ${target}…`}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={`Message ${target}`}
        />
        <button type="submit" className="cta" disabled={!draft.trim() || sending} aria-label="Send">
          <Icon name="send" size={16} stroke={2.2} />
        </button>
      </form>
    </section>
  )
}
