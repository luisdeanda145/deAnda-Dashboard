import { Avatar } from './ui'
import { useApp } from '../lib/store'

const MAX = 5

/** "Only you", "You and Grace", "You, Grace and 2 others" */
function label(others) {
  if (!others.length) return 'Only you'
  if (others.length === 1) return `You and ${others[0]}`
  if (others.length === 2) return `You, ${others[0]} and ${others[1]}`
  return `You, ${others[0]} and ${others.length - 1} others`
}

/** A small pill at the very top: who else has the board open right now. */
export default function Online() {
  const { online, myName } = useApp()
  if (!myName) return null
  const others = online.filter((n) => n !== myName).sort()
  const faces = [myName, ...others]
  return (
    <div className="online-now" role="status" aria-label={`Online now: ${faces.join(', ')}`} title={`Online now: ${faces.join(', ')}`}>
      <i className="online-dot" />
      <span className="online-faces">
        {faces.slice(0, MAX).map((n) => (
          <Avatar key={n} person={n} size={20} />
        ))}
        {faces.length > MAX && <b>+{faces.length - MAX}</b>}
      </span>
      <span className="online-text">{label(others)} online</span>
    </div>
  )
}
