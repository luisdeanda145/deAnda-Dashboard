import Orb from '../components/Orb'

/** The AI assistant's spot beside My Open Tasks: a moving orb on a glass tile. Click to open the assistant. */
export default function AssistantOrb({ onOpen }) {
  return (
    <button type="button" className="win widget orb-tile hl" style={{ '--n': 1 }} aria-label="Open the AI assistant" onClick={(e) => onOpen(e.currentTarget)}>
      <Orb state="composing" size={64} fps={30} />
    </button>
  )
}
