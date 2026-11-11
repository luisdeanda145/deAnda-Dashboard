import { useState } from 'react'
import { Avatar, CardHead, PageHead, Stat } from '../components/ui'
import { PILLARS, TEAM, pillarTone } from '../data/board'
import { dow, fmtDay, fmtMonth, hrs, todayISO } from '../lib/format'
import { dailyHours, loggedIn } from '../lib/selectors'
import { useApp } from '../lib/store'

/** Overview → DAILY HOURS TRACKER as a heat map, plus where the hours went. */
export default function Hours() {
  const { tasks, month } = useApp()
  const [hover, setHover] = useState(null) // { r, c }
  const today = todayISO()
  const rows = TEAM.map((p) => ({ name: p.name, days: dailyHours(tasks, month, p.name) }))
  const team = dailyHours(tasks, month)
  const days = team.map((_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
  const max = Math.max(1, ...rows.flatMap((r) => r.days))
  const teamMax = Math.max(1, ...team)
  const total = team.reduce((a, b) => a + b, 0)

  const elapsed = days.filter((d) => d <= today && !['Sat', 'Sun'].includes(dow(d))).length || 1
  const busiest = team.indexOf(Math.max(...team))
  const top = rows.map((r) => ({ name: r.name, v: r.days.reduce((a, b) => a + b, 0) })).sort((a, b) => b.v - a.v)[0]

  const byPillar = [...PILLARS.map((p) => p.name), 'Other']
    .map((name) => ({
      name,
      v: tasks.filter((t) => (name === 'Other' ? !PILLARS.some((p) => p.name === t.pillar) : t.pillar === name)).reduce((a, t) => a + loggedIn(t, month), 0),
    }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
  const pMax = Math.max(1, ...byPillar.map((x) => x.v))

  const tip = hover && (hover.r === -1 ? team[hover.c] : rows[hover.r].days[hover.c])

  return (
    <>
      <PageHead title="Hours" sub={`Hours of Done tasks, credited to their Completed Date · ${fmtMonth(month)}`} />

      <div className="stats">
        <Stat d={1} icon="clock" label="Hours logged this month" value={total} />
        <Stat d={2} icon="chart" label="Avg. per workday so far" value={total / elapsed} />
        <Stat d={3} icon="calendar" label={`Busiest day · ${fmtDay(days[busiest])}`} value={team[busiest]} />
        <Stat d={4} icon="user" label={`Most hours · ${top.name}`} value={top.v} />
      </div>

      <article className="card heat-card rise" style={{ '--d': 5 }}>
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
                <Avatar person={r.name} size={22} /> {r.name}
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

      <article className="card rise" style={{ '--d': 6 }}>
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
    </>
  )
}
