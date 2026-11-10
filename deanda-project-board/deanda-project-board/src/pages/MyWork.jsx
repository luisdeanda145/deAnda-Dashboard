import { useState } from 'react'
import Icon from '../components/Icon'
import { Avatar, PageHead, Prio, Segmented, Select, Stat, StatusPill } from '../components/ui'
import { TEAM, USER, pillarTone } from '../data/board'
import { dueLabel, fmtDay, fmtMonth, hrs, todayISO } from '../lib/format'
import { BUCKETS, dueBucket, isDone, personal } from '../lib/selectors'
import { useApp } from '../lib/store'

const FILTERS = ['Open', 'Done', 'All']
const CAP = 24

export function TaskRow({ t, d, showOwner }) {
  const { toggleDone, openTask } = useApp()
  const late = !isDone(t) && dueLabel(t.due).includes('late')
  return (
    <li
      className={`card task hl rise${isDone(t) ? ' done' : ''}${t.fresh ? ' fresh' : ''}`}
      style={{ '--d': d }}
      onClick={() => openTask(t)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && openTask(t)}
    >
      <button
        type="button"
        className="tick-box"
        aria-label={isDone(t) ? 'Reopen task' : 'Mark as done'}
        onClick={(e) => {
          e.stopPropagation()
          toggleDone(t)
        }}
      >
        <Icon name="check" size={14} stroke={2.6} />
      </button>
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
      <span className="task-hrs" title="Est. / real story points (hrs)">
        {isDone(t) ? `${hrs(t.real)} / ${hrs(t.est)}h` : `${hrs(t.est)}h`}
      </span>
      <time className={late ? 'late' : ''}>{isDone(t) ? fmtDay(t.completed) : dueLabel(t.due)}</time>
    </li>
  )
}

export default function MyWork() {
  const { tasks, month, me, setMe, addTask, openTask, toast } = useApp()
  const [filter, setFilter] = useState('Open')
  const [draft, setDraft] = useState('')
  const [more, setMore] = useState(false)
  const p = personal(tasks, me, month)
  const today = todayISO()

  const add = (e) => {
    e.preventDefault()
    const title = draft.trim()
    if (!title) return
    addTask({ title, owner: me, pillar: null, workstream: null, priority: 'P1', status: 'Not started', due: today, completed: null, est: null, real: null, notes: null })
    toast({ icon: 'plus', title: 'Added for today', text: 'Open it to set pillar and hours' })
    setDraft('')
    setFilter('Open')
  }

  const shown = p.mine.filter((t) => filter === 'All' || (filter === 'Done') === isDone(t))
  const groups = BUCKETS.map((b) => {
    let list = shown.filter((t) => dueBucket(t, today) === b)
    list = b === 'Done' ? list.sort((x, y) => (y.completed || '').localeCompare(x.completed || '')) : list.sort((x, y) => (x.due || '').localeCompare(y.due || '') || (x.priority || 'P9').localeCompare(y.priority || 'P9'))
    return { b, list }
  }).filter((g) => g.list.length)

  const title = me === USER.name ? 'My Work' : `${me}’s Tasks`
  let d = 6
  return (
    <>
      <PageHead title={title} sub={`${me}’s tab · ${fmtMonth(month)} to-do list`}>
        <Select
          value={me}
          options={TEAM.map((x) => x.name)}
          onChange={setMe}
          render={(n) => (
            <span className="sel-person">
              <Avatar person={n} size={22} /> {n}
            </span>
          )}
        />
        <Segmented value={filter} options={FILTERS} onChange={setFilter} />
      </PageHead>

      <div className="stats">
        <Stat d={1} icon="task" label="Open tasks" value={p.open} fmt={(v) => Math.round(v)} />
        <Stat d={2} icon="check" label="Done this month" value={p.doneMonth} fmt={(v) => Math.round(v)} />
        <Stat d={3} icon="clock" label="Est. hours still open" value={p.estOpen} />
        <Stat d={4} icon="bolt" label="Real hours this month" value={p.realMonth} />
      </div>

      <form className="add-task rise" style={{ '--d': 5 }} onSubmit={add}>
        <Icon name="plus" size={18} stroke={2} />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Add a task to ${me}’s tab for today and press Enter`} />
        <button type="button" className="chip" onClick={() => openTask({ owner: me, title: draft })}>
          Details
        </button>
        <kbd>↵</kbd>
      </form>

      {groups.map(({ b, list }) => {
        const cut = b === 'Done' && !more ? list.slice(0, CAP) : list
        return (
          <section key={b} className="task-group">
            <h2 className={`rise${b === 'Overdue' ? ' late' : ''}`} style={{ '--d': d++ }}>
              {b} <span>{list.length}</span>
            </h2>
            <ul>
              {cut.map((t) => (
                <TaskRow key={t.id} t={t} d={Math.min(d++, 18)} />
              ))}
            </ul>
            {cut.length < list.length && (
              <button type="button" className="chip more" onClick={() => setMore(true)}>
                Show {list.length - cut.length} more
              </button>
            )}
          </section>
        )
      })}
      {groups.length === 0 && (
        <div className="card empty-card rise" style={{ '--d': 6 }}>
          <Icon name="check" size={26} />
          <b>{filter === 'Open' ? 'Nothing open' : 'Nothing here yet'}</b>
          <span>{filter === 'Open' ? `${me} has no open tasks on this board.` : 'Tasks will appear here as they’re logged.'}</span>
        </div>
      )}
    </>
  )
}
