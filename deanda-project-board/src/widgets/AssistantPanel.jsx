import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import Orb from '../components/Orb'
import { Segmented } from '../components/ui'
import { ASSISTANT_PERIODS, askAssistant } from '../lib/api'

/* true: the panel shows "Under construction" and asks nothing (the server code stays deployed) */
const UNDER_CONSTRUCTION = false

const SUGGESTIONS = ['Summarize this period', 'What’s blocked or late?', 'Who logged the most hours?']
const label = (id) => ASSISTANT_PERIODS.find((p) => p.id === id)?.label
const PHRASE = { today: 'today', '3days': 'the last 3 days', week: 'this week', month: 'this month' }

/** **bold** inside a line */
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>))
}
/** the reply's light markdown: paragraphs and "- " bullets */
function Reply({ text }) {
  const blocks = []
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/)
    if (bullet) {
      const last = blocks[blocks.length - 1]
      if (last?.type === 'ul') last.items.push(bullet[1])
      else blocks.push({ type: 'ul', items: [bullet[1]] })
    } else if (line.trim()) blocks.push({ type: 'p', text: line.replace(/^#+\s*/, '') })
  }
  return blocks.map((b, i) =>
    b.type === 'ul' ? (
      <ul key={i}>
        {b.items.map((it, j) => (
          <li key={j}>{inline(it)}</li>
        ))}
      </ul>
    ) : (
      <p key={i}>{inline(b.text)}</p>
    ),
  )
}

/**
 * The AI assistant over the right column: pick a period, ask for a summary.
 * Read-only: it answers from the board's data and can't change tasks.
 */
export default function AssistantPanel({ onClose, closing, origin }) {
  const frame = { className: `win widget assistant-panel${closing ? ' closing' : ''}`, style: { transformOrigin: origin } }
  return UNDER_CONSTRUCTION ? <Paused onClose={onClose} frame={frame} /> : <Chat onClose={onClose} frame={frame} />
}

/** While the assistant is switched off: a text box that doesn't send anything. */
function Paused({ onClose, frame }) {
  const input = useRef(null)
  useEffect(() => {
    input.current?.focus({ preventScroll: true })
  }, [])
  return (
    <section {...frame} role="dialog" aria-label="AI assistant" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <header className="as-head">
        <Orb state="composing" size={20} fps={30} />
        <h3>Assistant</h3>
        <span className="as-badge">
          <Icon name="alert" size={12} stroke={2.2} /> Under construction
        </span>
        <button type="button" className="round-btn as-close" aria-label="Close the assistant" onClick={onClose}>
          <Icon name="close" size={14} stroke={2} />
        </button>
      </header>
      <div className="as-body">
        <div className="as-empty">
          <b>Under construction</b>
          <p>Coming soon: quick summaries of your tasks, hours and the team’s week.</p>
        </div>
      </div>
      <form className="as-compose" onSubmit={(e) => e.preventDefault()}>
        <textarea ref={input} rows={1} placeholder="Ask the assistant…" aria-label="Message the assistant" onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && e.preventDefault()} />
        <button type="submit" className="cta" disabled aria-label="Send (coming soon)" title="Coming soon">
          <Icon name="send" size={16} stroke={2.2} />
        </button>
      </form>
    </section>
  )
}

function Chat({ onClose, frame }) {
  const [period, setPeriod] = useState('today')
  const [draft, setDraft] = useState('')
  const [chat, setChat] = useState([]) // { role: 'user' | 'assistant' | 'error', text, period? }
  const [busy, setBusy] = useState(false)
  const input = useRef(null)
  const scroller = useRef(null)

  useEffect(() => {
    input.current?.focus({ preventScroll: true })
  }, [])
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.length, busy])

  const ask = async (text) => {
    const question = text.trim()
    if (!question || busy) return
    const history = chat.filter((m) => m.role !== 'error').map(({ role, text }) => ({ role, text }))
    setChat((c) => [...c, { role: 'user', text: question, period }])
    setDraft('')
    setBusy(true)
    try {
      const reply = await askAssistant({ period, question, history })
      setChat((c) => [...c, { role: 'assistant', text: reply }])
    } catch (e) {
      setChat((c) => [...c, { role: 'error', text: e.message }])
    } finally {
      setBusy(false)
      input.current?.focus({ preventScroll: true })
    }
  }

  return (
    <section {...frame} role="dialog" aria-label="AI assistant" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <header className="as-head">
        <Orb state="composing" size={20} fps={30} />
        <h3>Assistant</h3>
        <button type="button" className="round-btn as-close" aria-label="Close the assistant" onClick={onClose}>
          <Icon name="close" size={14} stroke={2} />
        </button>
      </header>

      <div className="as-period">
        <Segmented value={label(period)} options={ASSISTANT_PERIODS.map((p) => p.label)} onChange={(l) => setPeriod(ASSISTANT_PERIODS.find((p) => p.label === l).id)} />
      </div>

      <div className="as-body" ref={scroller} aria-live="polite">
        {chat.length === 0 ? (
          <div className="as-empty">
            <b>Ask for a summary</b>
            <p>Pick a period above, then ask about tasks, hours or what’s stuck. Answers come from the board; the assistant can’t change tasks.</p>
            <div className="as-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="as-chat">
            {chat.map((m, i) => (
              <li key={i} className={`as-msg ${m.role}`}>
                {m.role === 'user' && <span className="as-tag">{label(m.period)}</span>}
                {m.role === 'assistant' ? <Reply text={m.text} /> : <p>{m.text}</p>}
              </li>
            ))}
            {busy && (
              <li className="as-msg assistant as-thinking">
                <Orb state="composing" size={20} fps={30} />
                <span>Reading the board…</span>
              </li>
            )}
          </ol>
        )}
      </div>

      <form
        className="as-compose"
        onSubmit={(e) => {
          e.preventDefault()
          ask(draft)
        }}
      >
        <textarea
          ref={input}
          rows={1}
          value={draft}
          maxLength={2000}
          placeholder={`Ask about ${PHRASE[period]}…`}
          aria-label="Message the assistant"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              ask(draft)
            }
          }}
        />
        <button type="submit" className="cta" disabled={!draft.trim() || busy} aria-label="Send">
          <Icon name="send" size={16} stroke={2.2} />
        </button>
      </form>
    </section>
  )
}
