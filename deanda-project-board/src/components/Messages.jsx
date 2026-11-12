import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { Avatar } from './ui'
import { TEAM } from '../data/board'
import { useApp } from '../lib/store'

const MAX = 500

const time = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

/** "Today", "Yesterday", "Tue, Nov 10" */
function day(iso) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "2:41 PM" today, "Tue" this week, else "Nov 3": for the people list */
function short(iso) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return time(iso)
  if (now - d < 6 * 86400000) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * The small chat button in My Work's header that opens the messages card.
 * Shows how many messages you haven't read.
 */
export function MessagesButton({ open, onClick }) {
  const { unread } = useApp()
  return (
    <button
      type="button"
      className={`round-btn lg msg-toggle${open ? ' on' : ''}${unread ? ' has-new' : ''}`}
      aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}
      aria-expanded={open}
      onClick={onClick}
    >
      <Icon name="chat" size={20} />
      {unread > 0 && <b>{unread}</b>}
    </button>
  )
}

/**
 * Messages, like a chat app: your teammates on one side, your conversation with
 * whoever is picked on the other. Sent on the right, received on the left.
 */
export default function Messages({ onClose }) {
  const { me, messages, myName, sendMessage, markRead } = useApp()
  const box = useRef(null)
  const scroller = useRef(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  /* every teammate, with your conversation with them */
  const people = useMemo(() => {
    if (!myName) return []
    return TEAM.map((p) => p.name)
      .filter((n) => n !== myName)
      .map((name, i) => {
        const thread = messages
          .filter((m) => (m.from_name === myName && m.to_name === name) || (m.from_name === name && m.to_name === myName))
          .slice()
          .sort((a, b) => a.created_at.localeCompare(b.created_at) || String(a.id).localeCompare(String(b.id)))
        const unread = thread.filter((m) => m.to_name === myName && !m.read_at)
        return { name, i, thread, last: thread[thread.length - 1], unread }
      })
      .sort((a, b) => (b.last?.created_at || '').localeCompare(a.last?.created_at || '') || a.i - b.i)
  }, [messages, myName])

  /* open on: the teammate whose tab you're on, else whoever wrote last unread, else your latest chat */
  const [active, setActive] = useState(() => {
    if (me && me !== myName && people.some((p) => p.name === me)) return me
    const waiting = people.filter((p) => p.unread.length).sort((a, b) => b.unread.at(-1).created_at.localeCompare(a.unread.at(-1).created_at))
    return (waiting[0] || people[0])?.name || null
  })
  const chat = people.find((p) => p.name === active)
  const thread = chat?.thread || []
  const unreadKey = (chat?.unread || []).filter((m) => !String(m.id).startsWith('tmp-')).map((m) => m.id).join(',')

  /* on a phone the card opens below the stats: bring it into view */
  useEffect(() => {
    box.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  /* the newest message is at the bottom */
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [active, thread.length])

  /* looking at a conversation reads it */
  useEffect(() => {
    if (!unreadKey) return
    const ids = unreadKey.split(',').map((x) => (/^\d+$/.test(x) ? Number(x) : x))
    const t = setTimeout(() => markRead(ids), 700)
    return () => clearTimeout(t)
  }, [unreadKey, markRead])

  const send = async (e) => {
    e?.preventDefault()
    if (!draft.trim() || sending || !active) return
    setSending(true)
    const ok = await sendMessage(active, draft)
    setSending(false)
    if (ok) setDraft('')
  }

  const close = (
    <button type="button" className="round-btn msgs-close" aria-label="Close messages" onClick={onClose}>
      <Icon name="close" size={14} stroke={2} />
    </button>
  )

  if (!myName) {
    return (
      <section className="card msgs rise" style={{ '--d': 5 }} ref={box}>
        <header className="msgs-head">
          <h2>
            <Icon name="chat" size={18} /> Messages
          </h2>
          {close}
        </header>
        <p className="muted-line">Messages need your sign-in to match a name on the team. Ask an admin to add you in Settings → Team.</p>
      </section>
    )
  }

  const total = people.reduce((n, p) => n + p.unread.length, 0)
  return (
    <section className={`card msgs rise${total ? ' has-new' : ''}`} style={{ '--d': 5 }} ref={box}>
      <header className="msgs-head">
        <h2>
          <Icon name="chat" size={18} /> Messages
          {total > 0 && <span className="msgs-new">{total} new</span>}
        </h2>
        <small>Latest 10 each · cleared every month</small>
        {close}
      </header>

      <div className="chat">
        <ul className="chat-people" aria-label="Conversations">
          {people.map((p) => (
            <li key={p.name}>
              <button type="button" className={`${p.name === active ? 'on' : ''}${p.unread.length ? ' unread' : ''}`} aria-current={p.name === active || undefined} onClick={() => setActive(p.name)}>
                <Avatar person={p.name} size={30} />
                <span className="cp-text">
                  <span className="cp-top">
                    <b>{p.name}</b>
                    {p.last && <time>{short(p.last.created_at)}</time>}
                  </span>
                  <span className="cp-last">{p.last ? `${p.last.from_name === myName ? 'You: ' : ''}${p.last.body}` : 'No messages yet'}</span>
                </span>
                {p.unread.length > 0 && <i>{p.unread.length}</i>}
              </button>
            </li>
          ))}
        </ul>

        <div className="chat-pane">
          {chat ? (
            <>
              <div className="chat-who">
                <Avatar person={chat.name} size={26} />
                <b>{chat.name}</b>
              </div>
              <ol className="chat-msgs" ref={scroller}>
                {thread.length === 0 && <li className="chat-empty">No messages with {chat.name} this month. Say hi.</li>}
                {thread.map((m, i) => {
                  const mine = m.from_name === myName
                  const newDay = i === 0 || day(m.created_at) !== day(thread[i - 1].created_at)
                  return (
                    <li key={m.id} className="chat-row">
                      {newDay && <span className="chat-day">{day(m.created_at)}</span>}
                      <div className={`msg-bubble ${mine ? 'out' : 'in'}${!mine && !m.read_at ? ' fresh' : ''}${String(m.id).startsWith('tmp-') ? ' sending' : ''}`}>
                        <p>{m.body}</p>
                        <time dateTime={m.created_at}>{time(m.created_at)}</time>
                      </div>
                    </li>
                  )
                })}
              </ol>
              <form className="msgs-send" onSubmit={send}>
                <input value={draft} maxLength={MAX} placeholder={`Message ${chat.name}…`} onChange={(e) => setDraft(e.target.value)} aria-label={`Message ${chat.name}`} />
                <button type="submit" className="cta" disabled={!draft.trim() || sending} aria-label="Send">
                  <Icon name="send" size={16} stroke={2.2} />
                </button>
              </form>
            </>
          ) : (
            <p className="muted-line chat-empty">Add teammates in Settings → Team to start a chat.</p>
          )}
        </div>
      </div>
    </section>
  )
}
