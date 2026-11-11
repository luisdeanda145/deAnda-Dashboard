import Icon from './Icon'
import { Prio, StatusPill, TaskDates } from './ui'
import { pillarTone } from '../data/board'
import { hrs, pts } from '../lib/format'
import { isDone } from '../lib/selectors'
import { useApp } from '../lib/store'

/** One task as a row: priority, title, pillar, points / hours and its dates. */
export function TaskRow({ t, d, showOwner }) {
  const { openTask } = useApp()
  return (
    <li
      className={`card task hl rise${isDone(t) ? ' done' : ''}${t.fresh ? ' fresh' : ''}`}
      style={{ '--d': d }}
      onClick={() => openTask(t)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && openTask(t)}
    >
      <Prio p={t.priority} />
      <div className="task-body">
        <b>{t.title}</b>
        <span>
          {showOwner && <em className="task-owner">{t.owner}</em>}
          {t.pillar && <i className={`dot ${pillarTone(t.pillar)}`} />}
          {[t.pillar, t.workstream].filter(Boolean).join(' · ') || 'No pillar'}
          {t.notes && <em className="task-note"> — {t.notes}</em>}
        </span>
      </div>
      {t.status !== 'Not started' && t.status !== 'Done' && <StatusPill status={t.status} />}
      {isDone(t) && (
        <span className="done-badge">
          <Icon name="check" size={12} stroke={2.6} /> Completed
        </span>
      )}
      <span className="task-hrs" title="Story points · hours">
        <span>{pts(t.points)}</span>
        {t.hours != null && <span>{hrs(t.hours)}h</span>}
      </span>
      <TaskDates t={t} stack />
    </li>
  )
}
