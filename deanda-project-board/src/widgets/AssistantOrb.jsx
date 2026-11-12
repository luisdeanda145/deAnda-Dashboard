import { ThinkingOrb } from 'thinking-orbs'

/** The AI assistant's spot beside My Open Tasks: a moving orb on a glass tile. Click to open the assistant. */
export default function AssistantOrb({ onOpen }) {
  return (
    <button type="button" className="win widget orb-tile hl" style={{ '--n': 1 }} aria-label="Open the AI assistant" onClick={onOpen}>
      <ThinkingOrb state="working" size={64} theme="dark" aria-hidden="true" />
    </button>
  )
}
