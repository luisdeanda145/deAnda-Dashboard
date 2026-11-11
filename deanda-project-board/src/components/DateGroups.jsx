import { useState } from 'react'
import { TaskRow } from './TaskRow'
import { addDays, dayName, diffDays, fmtRange, todayISO, weekName, weekStart } from '../lib/format'

/** Groups tasks into weeks (Monday to Sunday) and days, by due date or completed date. */
function group(list, key, newestFirst) {
  const weeks = new Map()
  const undated = []
  list.forEach((t) => {
    const day = t[key]
    if (!day) return undated.push(t)
    const wk = weekStart(day)
    if (!weeks.has(wk)) weeks.set(wk, new Map())
    const days = weeks.get(wk)
    if (!days.has(day)) days.set(day, [])
    days.get(day).push(t)
  })
  const dir = newestFirst ? -1 : 1
  const byPrio = (a, b) => (a.priority || 'P9').localeCompare(b.priority || 'P9')
  return {
    weeks: [...weeks.entries()]
      .sort(([a], [b]) => a.localeCompare(b) * dir)
      .map(([monday, days]) => ({
        monday,
        days: [...days.entries()].sort(([a], [b]) => a.localeCompare(b) * dir).map(([day, tasks]) => ({ day, tasks: tasks.sort(byPrio) })),
      })),
    undated: undated.sort(byPrio),
  }
}

/**
 * A task list sectioned by week, then by day. Every heading names its date.
 *   mode 'open' → by Due Date, oldest first, so overdue days lead
 *   mode 'done' → by Completed Date, newest first
 */
export default function DateGroups({ tasks, mode = 'open', showOwner, limit = 60, d0 = 6 }) {
  const [cap, setCap] = useState(limit)
  const today = todayISO()
  const done = mode === 'done'
  const { weeks, undated } = group(tasks, done ? 'completed' : 'due', done)
  let shown = 0
  let d = d0

  const rows = (list) => {
    const out = []
    for (const t of list) {
      if (shown >= cap) break
      shown++
      out.push(<TaskRow key={t.id} t={t} d={Math.min(d++, 18)} showOwner={showOwner} />)
    }
    return out
  }

  const sections = []
  for (const w of weeks) {
    if (shown >= cap) break
    const sunday = addDays(w.monday, 6)
    const name = weekName(w.monday, today)
    const count = w.days.reduce((a, x) => a + x.tasks.length, 0)
    const lateWeek = !done && sunday < today
    sections.push(
      <section key={w.monday} className={`week-group${lateWeek ? ' week-late' : ''}`}>
        <h2 className="rise" style={{ '--d': d++ }}>
          {name ? (
            <>
              {name} <em>{fmtRange(w.monday, sunday)}</em>
            </>
          ) : (
            fmtRange(w.monday, sunday)
          )}
          <span>{count}</span>
        </h2>
        {w.days.map(({ day, tasks: list }) => {
          if (shown >= cap) return null
          const late = !done && day < today
          return (
            <div key={day} className="day-group">
              <h3 className={`rise${late ? ' late' : ''}${day === today ? ' today' : ''}`} style={{ '--d': d++ }}>
                {dayName(day, today)}
                {late && <em>{diffDays(today, day)}d late</em>}
                <span>{list.length}</span>
              </h3>
              <ul>{rows(list)}</ul>
            </div>
          )
        })}
      </section>,
    )
  }
  if (undated.length && shown < cap) {
    sections.push(
      <section key="undated" className="week-group">
        <h2 className="rise" style={{ '--d': d++ }}>
          {done ? 'No completed date' : 'No due date'} <span>{undated.length}</span>
        </h2>
        <ul>{rows(undated)}</ul>
      </section>,
    )
  }

  return (
    <div className={`date-groups ${mode}`}>
      {sections}
      {tasks.length > cap && (
        <button type="button" className="chip more" onClick={() => setCap((c) => c + limit)}>
          Show {Math.min(limit, tasks.length - cap)} more of {tasks.length - cap}
        </button>
      )}
    </div>
  )
}
