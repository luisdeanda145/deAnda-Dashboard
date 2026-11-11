import { useState } from 'react'
import Icon from './Icon'
import { TaskRow } from './TaskRow'
import { addDays, dayName, diffDays, fmtDow, fmtRange, todayISO, weekName, weekStart } from '../lib/format'

const OVERDUE_FOLD = 6 // more overdue tasks than this start folded to one line

const byPrio = (a, b) => (a.priority || 'P9').localeCompare(b.priority || 'P9')

/** day → its tasks, sorted by day in the given direction */
function daysOf(list, key, dir) {
  const map = new Map()
  list.forEach((t) => {
    const d = t[key]
    if (!map.has(d)) map.set(d, [])
    map.get(d).push(t)
  })
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b) * dir).map(([day, tasks]) => ({ day, tasks: tasks.sort(byPrio) }))
}

/** split days into calendar weeks, keeping their order */
function weeksOf(days) {
  const out = []
  days.forEach((d) => {
    const monday = weekStart(d.day)
    const last = out[out.length - 1]
    if (last && last.monday === monday) last.days.push(d)
    else out.push({ monday, days: [d] })
  })
  return out
}

const weekTitle = (monday, today, prefix) => {
  const range = fmtRange(monday, addDays(monday, 6))
  const name = prefix || weekName(monday, today)
  return { title: name || range, sub: name ? range : null }
}

/**
 * The sections for a list, starting from today.
 * Open work runs forward: Today, Overdue (most recent first), the rest of
 * this week, next week, later weeks, no date.
 * Completed work runs back: Today, earlier this week, last week, older weeks.
 */
function sectionsFor(tasks, done, today) {
  const key = done ? 'completed' : 'due'
  const dated = tasks.filter((t) => t[key])
  const undated = tasks.filter((t) => !t[key]).sort(byPrio)
  const thisWeek = weekStart(today)
  const out = []

  const todays = dated.filter((t) => t[key] === today)
  if (todays.length) out.push({ id: 'today', title: 'Today', sub: fmtDow(today), tone: 'today', days: [{ day: today, tasks: todays.sort(byPrio), bare: true }] })

  if (done) {
    const past = daysOf(dated.filter((t) => t[key] < today), key, -1)
    weeksOf(past).forEach((w) => {
      const head = w.monday === thisWeek ? { title: 'Earlier this week', sub: fmtRange(w.monday, addDays(w.monday, 6)) } : weekTitle(w.monday, today)
      out.push({ id: w.monday, ...head, days: w.days })
    })
    const ahead = daysOf(dated.filter((t) => t[key] > today), key, 1)
    if (ahead.length) out.push({ id: 'future', title: 'Completed date in the future', sub: 'Check these dates', tone: 'warn', days: ahead })
    if (undated.length) out.push({ id: 'undated', title: 'No completed date', days: [{ day: null, tasks: undated, bare: true }] })
    return out
  }

  const overdue = daysOf(dated.filter((t) => t[key] < today), key, -1)
  if (overdue.length) out.push({ id: 'overdue', title: 'Overdue', sub: 'most recent first', tone: 'late', fold: true, days: overdue })

  const ahead = daysOf(dated.filter((t) => t[key] > today), key, 1)
  weeksOf(ahead).forEach((w) => {
    const head = w.monday === thisWeek ? { title: 'Rest of this week', sub: fmtRange(addDays(today, 1), addDays(w.monday, 6)) } : weekTitle(w.monday, today)
    out.push({ id: w.monday, ...head, days: w.days })
  })
  if (undated.length) out.push({ id: 'undated', title: 'No due date', days: [{ day: null, tasks: undated, bare: true }] })
  return out
}

/**
 * A task list sectioned from today outwards, then by day. Every heading names its date.
 *   mode 'open' → by Due Date, forward in time
 *   mode 'done' → by Completed Date, back in time
 */
export default function DateGroups({ tasks, mode = 'open', showOwner, limit = 60, d0 = 6 }) {
  const today = todayISO()
  const done = mode === 'done'
  const sections = sectionsFor(tasks, done, today)
  const overdueCount = sections.find((s) => s.id === 'overdue')?.days.reduce((a, x) => a + x.tasks.length, 0) || 0
  const [unfolded, setUnfolded] = useState(overdueCount <= OVERDUE_FOLD)
  const [cap, setCap] = useState(limit)
  const total = sections.reduce((a, s) => a + (s.fold && !unfolded ? 0 : s.days.reduce((b, x) => b + x.tasks.length, 0)), 0)
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

  return (
    <div className={`date-groups ${mode}`}>
      {sections.map((s) => {
        if (shown >= cap) return null
        const count = s.days.reduce((a, x) => a + x.tasks.length, 0)
        const folded = s.fold && !unfolded
        return (
          <section key={s.id} className={`week-group${s.tone ? ` is-${s.tone}` : ''}`}>
            <h2 className="rise" style={{ '--d': d++ }}>
              {s.tone === 'late' && <Icon name="alert" size={16} />}
              {s.title}
              {s.sub && <em>{s.sub}</em>}
              <span>{count}</span>
              {s.fold && count > OVERDUE_FOLD && (
                <button type="button" className="chip sm-chip fold-btn" onClick={() => setUnfolded((u) => !u)}>
                  {folded ? 'Show' : 'Hide'}
                  <Icon name={folded ? 'chevDown' : 'chevUp'} size={13} stroke={2.2} />
                </button>
              )}
            </h2>
            {folded ? (
              <button type="button" className="card fold-line rise" style={{ '--d': d++ }} onClick={() => setUnfolded(true)}>
                {count} overdue tasks, the latest due {fmtDow(s.days[0].day)}, the oldest {fmtDow(s.days[s.days.length - 1].day)}
              </button>
            ) : (
              s.days.map(({ day, tasks: list, bare }) => {
                if (shown >= cap) return null
                if (bare) return <ul key={day || 'none'}>{rows(list)}</ul>
                const late = !done && day < today
                return (
                  <div key={day} className="day-group">
                    <h3 className={`rise${late ? ' late' : ''}`} style={{ '--d': d++ }}>
                      {dayName(day, today)}
                      {late && <em>{diffDays(today, day)}d late</em>}
                      <span>{list.length}</span>
                    </h3>
                    <ul>{rows(list)}</ul>
                  </div>
                )
              })
            )}
          </section>
        )
      })}
      {total > cap && (
        <button type="button" className="chip more" onClick={() => setCap((c) => c + limit)}>
          Show {Math.min(limit, total - cap)} more of {total - cap}
        </button>
      )}
    </div>
  )
}
