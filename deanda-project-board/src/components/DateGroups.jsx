import { useState } from 'react'
import { TaskRow } from './TaskRow'
import { addDays, dayName, diffDays, fmtRange, recencyRank, todayISO, weekName, weekStart } from '../lib/format'

/** Groups tasks into weeks (Monday to Sunday) and days, by due date or completed date. */
function group(list, key, today) {
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
  const byPrio = (a, b) => (a.priority || 'P9').localeCompare(b.priority || 'P9')
  const rank = (day) => recencyRank(day, today)
  /* this week first (today at the top), then older weeks going down, then weeks still to come */
  const weekRank = (monday) => (monday === weekStart(today) ? -1 : rank(monday))
  return {
    weeks: [...weeks.entries()]
      .sort(([a], [b]) => weekRank(a) - weekRank(b))
      .map(([monday, days]) => ({
        monday,
        future: monday > weekStart(today),
        days: [...days.entries()].sort(([a], [b]) => rank(a) - rank(b)).map(([day, tasks]) => ({ day, tasks: tasks.sort(byPrio) })),
      })),
    undated: undated.sort(byPrio),
  }
}

/**
 * A task list sectioned by week, then by day. Every heading names its date.
 * Today sits at the top, then the rest of this week, then older weeks the
 * further down you go; weeks still to come close the list under "Coming up".
 *   mode 'open' → by Due Date
 *   mode 'done' → by Completed Date
 */
export default function DateGroups({ tasks, mode = 'open', showOwner, limit = 60, d0 = 6 }) {
  const [cap, setCap] = useState(limit)
  const today = todayISO()
  const done = mode === 'done'
  const { weeks, undated } = group(tasks, done ? 'completed' : 'due', today)
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
  let upcoming = false
  for (const w of weeks) {
    if (shown >= cap) break
    if (w.future && !upcoming) {
      upcoming = true
      sections.push(
        <p key="coming-up" className="coming-up rise" style={{ '--d': d++ }}>
          Coming up
        </p>,
      )
    }
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
