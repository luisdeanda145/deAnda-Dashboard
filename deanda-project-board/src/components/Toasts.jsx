import Icon from './Icon'

/** Notifications drop in at the top centre, like system alerts in a headset. */
export default function Toasts({ items }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div className="toast" key={t.id}>
          <span className="toast-ic">
            <Icon name={t.icon || 'check'} size={18} stroke={2} />
          </span>
          <div>
            <strong>{t.title}</strong>
            {t.text && <span>{t.text}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
