import Icon from '../components/Icon'
import { CardHead } from '../components/ui'
import { USER } from '../data/board'
import { dueLabel, hrs } from '../lib/format'
import { useCountUp } from '../lib/hooks'
import { isOpen } from '../lib/selectors'
import { useApp } from '../lib/store'

/** Compact card: the signed-in person's open queue and a quick add. */
export default function QueueWidget() {
  const { tasks, openTask, setMe, go } = useApp()
  const mine = tasks.filter((t) => t.owner === USER.name && isOpen(t))
  const est = mine.reduce((a, t) => a + (t.est || 0), 0)
  const next = mine.filter((t) => t.due).sort((a, b) => a.due.localeCompare(b.due))[0]
  const n = useCountUp(mine.length, 1200, 650)

  return (
    <section className="win widget credits hl" style={{ '--n': 1 }}>
      <CardHead title="My Open Tasks" icon="user">
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMe(USER.name)
            go('mine')
          }}
        >
          View
        </button>
      </CardHead>
      <div className="credits-row">
        <strong className="figure">{Math.round(n)}</strong>
        <span className="used">{hrs(est)} hrs estimated</span>
        <button type="button" className="plus-btn" aria-label="New task" onClick={() => openTask({ owner: USER.name })}>
          <Icon name="plus" size={18} stroke={2.4} />
        </button>
      </div>
      {next && (
        <button type="button" className="next-up" onClick={() => openTask(next)}>
          <span>Next up</span>
          <b>{next.title}</b>
          <em className={dueLabel(next.due).includes('late') ? 'late' : ''}>{dueLabel(next.due)}</em>
        </button>
      )}
    </section>
  )
}
