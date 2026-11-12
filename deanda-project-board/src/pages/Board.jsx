import { useState } from 'react'
import Icon from '../components/Icon'
import { Avatar, PageHead, Prio, Segmented, Select, TaskDates } from '../components/ui'
import { ALL_PILLARS, PRIORITIES, STATUSES, TEAM, pillarTone } from '../data/board'
import { addDays, hrs, pts, sameWeek, todayISO } from '../lib/format'
import { useApp } from '../lib/store'

const ANY_OWNER = 'Everyone'
const ANY_PILLAR = 'All pillars'
const ANY_PRIO = 'Any priority'
const CAP = 30
const WHEN = ['All', 'Today', 'Yesterday', 'This week']

/** the day a task belongs to: when it was done, or when it's due */
const dayOf = (t) => (t.status === 'Done' ? t.completed || t.due : t.due)
function inWhen(t, when, today) {
  if (when === 'All') return true
  const d = dayOf(t)
  if (!d) return false
  if (when === 'Today') return d === today
  if (when === 'Yesterday') return d === addDays(today, -1)
  return sameWeek(d, today)
}

/** Kanban by status: drag a card to another lane, or use its arrow to move it on. */
export default function Board() {
  const { tasks, patchTask, toast, openSheet, openTask } = useApp()
  const [owner, setOwner] = useState(ANY_OWNER)
  const [pillar, setPillar] = useState(ANY_PILLAR)
  const [prio, setPrio] = useState(ANY_PRIO)
  const [when, setWhen] = useState('All')
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const [open, setOpen] = useState({})

  const today = todayISO()
  const list = tasks.filter(
    (t) =>
      (owner === ANY_OWNER || t.owner === owner) &&
      (pillar === ANY_PILLAR || t.pillar === pillar) &&
      (prio === ANY_PRIO || t.priority === prio) &&
      inWhen(t, when, today),
  )

  const move = (id, status) => {
    const t = tasks.find((x) => x.id === id)
    if (!t || t.status === status) return
    if (status === 'Done') {
      const patch = { status, completed: t.completed || todayISO() }
      patchTask(id, patch)
      /* hours only count once they're logged, so ask for them */
      if (t.hours == null) openSheet({ task: { ...t, ...patch }, hint: 'Log the hours it took — they count toward Hours Logged once saved.' })
      else toast({ icon: 'check', title: 'Done', text: t.title })
    } else {
      patchTask(id, { status, completed: null })
      toast({ icon: STATUSES.find((s) => s.id === status).icon, title: `Moved to ${status}`, text: t.title })
    }
  }
  const nextOf = (s) => STATUSES[Math.min(STATUSES.length - 1, STATUSES.findIndex((x) => x.id === s) + 1)].id

  const filtered = owner !== ANY_OWNER || pillar !== ANY_PILLAR || prio !== ANY_PRIO || when !== 'All'

  return (
    <>
      <PageHead title="Board" sub="Drag a card between lanes to change its status">
        <button type="button" className="cta" onClick={() => openTask({ owner: owner === ANY_OWNER ? undefined : owner, pillar: pillar === ANY_PILLAR ? null : pillar })}>
          <Icon name="plus" size={17} stroke={2.2} /> New task
        </button>
      </PageHead>

      <div className="filter-bar rise" style={{ '--d': 1 }}>
        <div className="filters">
          <Segmented value={when} options={WHEN} onChange={setWhen} />
          <Select value={owner} options={[ANY_OWNER, ...TEAM.map((p) => p.name)]} onChange={setOwner} align="left" prefix={<Icon name="user" size={15} />} />
          <Select value={pillar} options={[ANY_PILLAR, ...ALL_PILLARS]} onChange={setPillar} align="left" prefix={<Icon name="layers" size={15} />} />
          <Select value={prio} options={[ANY_PRIO, ...PRIORITIES.map((p) => p.id)]} onChange={setPrio} align="left" prefix={<Icon name="flag" size={15} />} />
          {filtered && (
            <button
              type="button"
              className="chip"
              onClick={() => {
                setOwner(ANY_OWNER)
                setPillar(ANY_PILLAR)
                setPrio(ANY_PRIO)
                setWhen('All')
              }}
            >
              Clear
            </button>
          )}
        </div>
        <span className="muted-line">
          {list.length} tasks · {pts(list.reduce((a, t) => a + (t.points || 0), 0))}
        </span>
      </div>

      <div className="board kanban">
        {STATUSES.map((s, si) => {
          let col = list.filter((t) => t.status === s.id)
          col =
            s.id === 'Done'
              ? col.sort((a, b) => (b.completed || '').localeCompare(a.completed || ''))
              : col.sort((a, b) => (a.priority || 'P9').localeCompare(b.priority || 'P9') || (a.due || '9').localeCompare(b.due || '9'))
          const cut = open[s.id] ? col : col.slice(0, CAP)
          const pointsIn = col.reduce((a, t) => a + (t.points || 0), 0)
          const hoursIn = col.reduce((a, t) => a + (t.hours || 0), 0)
          return (
            <section
              key={s.id}
              className={`lane rise${over === s.id && drag ? ' over' : ''}`}
              style={{ '--d': si + 2 }}
              onDragOver={(e) => {
                e.preventDefault()
                if (over !== s.id) setOver(s.id)
              }}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setOver(null)}
              onDrop={(e) => {
                e.preventDefault()
                move(e.dataTransfer.getData('text/plain'), s.id)
                setOver(null)
                setDrag(null)
              }}
            >
              <header>
                <i className={`dot ${s.tone}`} />
                <b>{s.id}</b>
                <span>{col.length}</span>
                <em>{s.id === 'Done' ? `${hrs(hoursIn)}h` : pts(pointsIn)}</em>
              </header>
              <div className="lane-cards">
                {cut.map((t) => {
                  return (
                    <article
                      key={t.id}
                      className={`deal tcard hl${t.status === 'Done' ? ' done' : ''}${drag === t.id ? ' dragging' : ''}${t.moved ? ' moved' : ''}`}
                      draggable
                      onClick={() => openTask(t)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', t.id)
                        e.dataTransfer.effectAllowed = 'move'
                        setDrag(t.id)
                      }}
                      onDragEnd={() => {
                        setDrag(null)
                        setOver(null)
                      }}
                    >
                      <span className="tcard-top">
                        <Prio p={t.priority} />
                        {t.pillar && (
                          <span className="tcard-pillar">
                            <i className={`dot ${pillarTone(t.pillar)}`} />
                            {t.pillar}
                          </span>
                        )}
                      </span>
                      <b>{t.title}</b>
                      {t.workstream && <span className="deal-co">{t.workstream}</span>}
                      {t.notes && s.id === 'Blocked' && <span className="tcard-note">{t.notes}</span>}
                      <footer>
                        <Avatar person={t.owner} size={22} />
                        <TaskDates t={t} stack={t.status === 'Done'} />
                        {t.points != null && <span title="Story points">{pts(t.points)}</span>}
                        {t.hours != null && (
                          <span title="Hours">
                            <Icon name="clock" size={13} /> {hrs(t.hours)}h
                          </span>
                        )}
                        {s.id !== 'Done' && (
                          <button
                            type="button"
                            aria-label={`Move to ${nextOf(s.id)}`}
                            title={`Move to ${nextOf(s.id)}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              move(t.id, nextOf(s.id))
                            }}
                          >
                            <Icon name="arrowRight" size={14} stroke={2.2} />
                          </button>
                        )}
                      </footer>
                    </article>
                  )
                })}
                {cut.length < col.length && (
                  <button type="button" className="lane-more" onClick={() => setOpen((o) => ({ ...o, [s.id]: true }))}>
                    Show {col.length - cut.length} more
                  </button>
                )}
                {col.length === 0 && <p className="lane-empty">Drop a task here</p>}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
