import { useEffect, useRef, useState } from 'react'
import { ThinkingOrb } from 'thinking-orbs'
import Icon from '../components/Icon'

/**
 * The AI assistant: opens over the whole right column. A chat layout with a
 * text box at the bottom; it isn't connected to anything yet, so nothing replies.
 */
export default function AssistantPanel({ onClose }) {
  const [draft, setDraft] = useState('')
  const input = useRef(null)

  useEffect(() => {
    input.current?.focus({ preventScroll: true })
  }, [])

  return (
    <section className="win widget assistant-panel" role="dialog" aria-label="AI assistant" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <header className="as-head">
        <ThinkingOrb state="searching" size={20} theme="dark" aria-hidden="true" />
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
        <textarea
          ref={input}
          rows={1}
          value={draft}
          placeholder="Ask the assistant…"
          aria-label="Message the assistant"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && e.preventDefault()}
        />
        <button type="submit" className="cta" disabled aria-label="Send (coming soon)" title="Coming soon">
          <Icon name="send" size={16} stroke={2.2} />
        </button>
      </form>
    </section>
  )
}
