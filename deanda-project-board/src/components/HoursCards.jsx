import { useState } from 'react'
import { Avatar, CardHead, Who } from './ui'
import { PILLARS, TEAM, pillarTone } from '../data/board'
import { dow, fmtDay, hrs, todayISO } from '../lib/format'
import { dailyHours, loggedIn } from '../lib/selectors'

/** Overview → DAILY HOURS TRACKER: person × day heat map, with the team's total per day. */
export function DailyHoursTracker({ tasks, month, delay = 5 }) {
  const [hover, setHover] = useState(null) // { r, c }
  const today = todayISO()
  const rows = TEAM.map((p) => ({ name: p.name, days: dailyHours(tasks, month, p.name) }))
  const team = dailyHours(tasks, month)
  const days = team.map((_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
  const max = Math.max(1, ...rows.flatMap((r) => r.days))
  const teamMax = Math.max(1, ...team)
  const total = team.reduce((a, b) => a + b, 0)
  const tip = hover && (hover.r === -1 ? team[hover.c] : rows[hover.r].days[hover.c])

  return (
    <article className="card heat-card ov-wide rise" style={{ '--d': delay }}>
      <CardHead title="Daily Hours Tracker">
        <span className="heat-tip">{hover ? `${hover.r === -1 ? 'Team' : rows[hover.r].name} · ${dow(days[hover.c])} ${fmtDay(days[hover.c])} · ${hrs(tip)} hrs` : 'Hover a day to see its hours'}</span>
      </CardHead>
      <div className="heat" style={{ '--cols': days.length }} onPointerLeave={() => setHover(null)}>
        <span />
        {days.map((d, c) => (
          <span key={d} className={`heat-x${['Sat', 'Sun'].includes(dow(d)) ? ' wkend' : ''}${d === today ? ' today' : ''}`}>
            {c + 1}
          </span>
        ))}
        <span className="heat-x">Total</span>

        {rows.map((r, ri) => (
          <div className="heat-row" key={r.name} style={{ '--i': ri }}>
            <span className="heat-who">
              <Avatar person={r.name} size={22} /> <Who name={r.name} />
            </span>
            {r.days.map((v, c) => (
              <i
                key={c}
                className={`heat-cell${v ? '' : ' zero'}${days[c] > today ? ' future' : ''}${days[c] === today ? ' today' : ''}${hover?.r === ri && hover?.c === c ? ' on' : ''}`}
                style={{ '--a': v / max }}
                onPointerEnter={() => setHover({ r: ri, c })}
              />
            ))}
            <b className="heat-sum">{hrs(r.days.reduce((a, b) => a + b, 0))}</b>
          </div>
        ))}

        <div className="heat-row team">
          <span className="heat-who">Team total</span>
          {team.map((v, c) => (
            <i
              key={c}
              className={`heat-bar${days[c] > today ? ' future' : ''}${hover?.r === -1 && hover?.c === c ? ' on' : ''}`}
              onPointerEnter={() => setHover({ r: -1, c })}
            >
              <em style={{ height: `${(v / teamMax) * 100}%` }} />
            </i>
          ))}
          <b className="heat-sum">{hrs(total)}</b>
        </div>
      </div>
      <div className="legend heat-legend">
        <span>Less</span>
        {[0.08, 0.3, 0.55, 0.8, 1].map((a) => (
          <i key={a} className="heat-cell" style={{ '--a': a }} />
        ))}
        <span>More</span>
        <span className="faint">Only Done tasks with a Completed Date count</span>
      </div>
    </article>
  )
}

/** Hours logged this month, by pillar. */
export function WhereHoursWent({ tasks, month, delay = 6 }) {
  const total = tasks.reduce((a, t) => a + loggedIn(t, month), 0)
  const byPillar = [...PILLARS.map((p) => p.name), 'Other']
    .map((name) => ({
      name,
      v: tasks.filter((t) => (name === 'Other' ? !PILLARS.some((p) => p.name === t.pillar) : t.pillar === name)).reduce((a, t) => a + loggedIn(t, month), 0),
    }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
  const pMax = Math.max(1, ...byPillar.map((x) => x.v))

  return (
    <article className="card ov-wide rise" style={{ '--d': delay }}>
      <CardHead title="Where The Hours Went" />
      <ul className="ws-bars">
        {byPillar.map((x, i) => (
          <li key={x.name} style={{ '--i': i }}>
            <span className="ws-name">
              <i className={`dot ${pillarTone(x.name)}`} /> {x.name}
            </span>
            <span className="ws-track">
              <i className="ws-done" style={{ width: `${(x.v / pMax) * 100}%` }} />
            </span>
            <span className="ws-n">{Math.round((x.v / (total || 1)) * 100)}%</span>
            <span className="ws-h">{hrs(x.v)}h</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

const TODAY_ROWS = 3

/** Overview → a small "Where The Hours Went" for today: hours on tasks finished today, by pillar. */
export function WhereHoursWentToday({ tasks, delay = 5 }) {
  const today = todayISO()
  const done = tasks.filter((t) => t.status === 'Done' && t.completed === today && t.hours > 0)
  const total = done.reduce((a, t) => a + t.hours, 0)
  const all = [...PILLARS.map((p) => p.name), 'Other']
    .map((name) => ({
      name,
      v: done.filter((t) => (name === 'Other' ? !PILLARS.some((p) => p.name === t.pillar) : t.pillar === name)).reduce((a, t) => a + t.hours, 0),
    }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
  /* keep it small: the top pillars, then the rest together */
  const rest = all.slice(TODAY_ROWS)
  const rows = rest.length > 1 ? [...all.slice(0, TODAY_ROWS), { name: `${rest.length} more`, v: rest.reduce((a, x) => a + x.v, 0), more: true }] : all
  const max = Math.max(1, ...rows.map((x) => x.v))

  return (
    <article className="card kpi-card hours-today rise" style={{ '--d': delay }}>
      <CardHead title="Where The Hours Went">
        <span className="faint-note">
          Today · {hrs(total)}h
        </span>
      </CardHead>
      {rows.length ? (
        <ul className="ws-bars">
          {rows.map((x, i) => (
            <li key={x.name} style={{ '--i': i }}>
              <span className="ws-name">
                <i className={`dot ${x.more ? 'mute' : pillarTone(x.name)}`} /> {x.name}
              </span>
              <span className="ws-track">
                <i className="ws-done" style={{ width: `${(x.v / max) * 100}%` }} />
              </span>
              <span className="ws-n">{Math.round((x.v / (total || 1)) * 100)}%</span>
              <span className="ws-h">{hrs(x.v)}h</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-line hours-today-empty">No hours logged on finished tasks yet today.</p>
      )}
    </article>
  )
}
