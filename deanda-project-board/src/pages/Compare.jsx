import { useState } from 'react'
import Icon from '../components/Icon'
import { MonthBars } from '../components/Charts'
import { Avatar, CardHead, PageHead, Segmented, Select } from '../components/ui'
import { PILLARS, TEAM } from '../data/board'
import { fmtMonth, hrs, monthTick } from '../lib/format'
import { monthStats, monthsWithData, shiftMonth } from '../lib/selectors'
import { useApp } from '../lib/store'

/* the headline figures, each read off monthStats() */
const KPIS = [
  { key: 'hours', label: 'Hours logged', icon: 'clock', fmt: hrs, unit: 'hrs' },
  { key: 'done', label: 'Tasks completed', icon: 'check', fmt: (v) => v },
  { key: 'ptsDone', label: 'Story points done', icon: 'target', fmt: hrs },
  { key: 'due', label: 'Tasks due', icon: 'calendar', fmt: (v) => v },
  { key: 'onTime', label: 'Done on time', icon: 'flag', fmt: (v) => (v == null ? '—' : `${Math.round(v)}%`), points: true },
  { key: 'people', label: 'People active', icon: 'users', fmt: (v) => v },
]

/** Change from b to a: "+12%", "−3 pts", "New" or "—". */
function Delta({ a, b, points }) {
  if (a == null || b == null) return <span className="delta flat">—</span>
  if (points) {
    const d = Math.round(a - b)
    return <span className={`delta${d > 0 ? ' up' : d < 0 ? ' down' : ' flat'}`}>{d === 0 ? 'No change' : `${d > 0 ? '+' : '−'}${Math.abs(d)} pts`}</span>
  }
  if (b === 0) return <span className={`delta${a > 0 ? ' new' : ' flat'}`}>{a > 0 ? 'New' : '—'}</span>
  const d = ((a - b) / b) * 100
  const r = Math.round(d)
  return (
    <span className={`delta${r > 0 ? ' up' : r < 0 ? ' down' : ' flat'}`}>
      {r !== 0 && <Icon name={r > 0 ? 'up' : 'down'} size={12} stroke={2.2} />}
      {r === 0 ? 'No change' : `${Math.abs(r)}%`}
    </span>
  )
}

/** Side-by-side table of one breakdown (people or pillars) for the two months. */
function Breakdown({ by, icon, rows, a, b, metric, setMetric, renderName }) {
  const title = `By ${by}`
  const field = `${metric === 'Hours' ? 'hours' : 'done'}By${by}`
  const fmt = metric === 'Hours' ? hrs : (v) => v
  const val = (s, name) => s[field][name] || 0
  const list = rows.map((name) => ({ name, a: val(a, name), b: val(b, name) })).sort((x, y) => y.a - x.a || y.b - x.b)
  const max = Math.max(1, ...list.flatMap((r) => [r.a, r.b]))
  return (
    <article className="card table-card rise" style={{ '--d': 8 }}>
      <CardHead title={title} icon={icon}>
        <Segmented value={metric} options={['Hours', 'Tasks']} onChange={setMetric} />
      </CardHead>
      <div className="table-wrap">
        <table className="table compact cmp-table">
          <thead>
            <tr>
              <th>{by === 'Person' ? 'Owner' : 'Pillar'}</th>
              <th className="cmp-bars-h">
                <span>
                  <i className="dot blue" /> {monthTick(a.ym)}
                </span>
                <span>
                  <i className="ring" /> {monthTick(b.ym)}
                </span>
              </th>
              <th className="num">{fmtMonth(a.ym)}</th>
              <th className="num">{fmtMonth(b.ym)}</th>
              <th className="num">Change</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={r.name} style={{ '--i': i }}>
                <td>{renderName(r.name)}</td>
                <td className="cmp-bars">
                  <span className="cmp-bar a" style={{ width: `${(r.a / max) * 100}%` }} />
                  <span className="cmp-bar b" style={{ width: `${(r.b / max) * 100}%` }} />
                </td>
                <td className="num">
                  <b>{fmt(r.a)}</b>
                </td>
                <td className="num">{fmt(r.b)}</td>
                <td className="num">
                  <Delta a={r.a} b={r.b} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Team</td>
              <td />
              <td className="num">{fmt(list.reduce((s, r) => s + r.a, 0))}</td>
              <td className="num">{fmt(list.reduce((s, r) => s + r.b, 0))}</td>
              <td className="num">
                <Delta a={list.reduce((s, r) => s + r.a, 0)} b={list.reduce((s, r) => s + r.b, 0)} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </article>
  )
}

/** Month over month: the reporting month against any earlier one. */
export default function Compare() {
  const { tasks, month } = useApp()
  const [a, setA] = useState(month)
  const [b, setB] = useState(() => shiftMonth(month, -1))
  const [pin, setPin] = useState(5)
  const [personMetric, setPersonMetric] = useState('Hours')
  const [pillarMetric, setPillarMetric] = useState('Hours')

  /* the last 12 months up to the reporting month, plus any other month that has dated work */
  const options = [...new Set([...Array.from({ length: 12 }, (_, i) => shiftMonth(month, -i)), ...monthsWithData(tasks)])].sort().reverse()
  const sa = monthStats(tasks, a)
  const sb = monthStats(tasks, b)
  const history = monthsWithData(tasks).filter((m) => m < a)

  /* six-month trend ending at month A */
  const trend = Array.from({ length: 6 }, (_, i) => {
    const ym = shiftMonth(a, i - 5)
    const s = monthStats(tasks, ym)
    return { m: monthTick(ym), ym, open: 0, closed: s.hours, done: s.done }
  })

  const people = [...new Set([...TEAM.map((p) => p.name), ...Object.keys(sa.hoursByPerson), ...Object.keys(sb.hoursByPerson)])]
  const pillars = [...new Set([...PILLARS.map((p) => p.name), ...Object.keys(sa.hoursByPillar), ...Object.keys(sb.hoursByPillar)])]
  const tone = (name) => PILLARS.find((p) => p.name === name)?.tone || 'mute'

  return (
    <>
      <PageHead title="Compare" sub="One month against another, by Completed Date and Due Date">
        <Select value={a} options={options} onChange={setA} render={fmtMonth} />
        <span className="cmp-vs">vs</span>
        <Select value={b} options={options} onChange={setB} render={fmtMonth} />
      </PageHead>

      {sb.empty && (
        <p className="cmp-note card rise" style={{ '--d': 1 }}>
          <Icon name="calendar" size={18} />
          <span>
            <b>No data for {fmtMonth(b)} yet.</b>{' '}
            {history.length
              ? `Months with history: ${history.map(fmtMonth).join(', ')}.`
              : `The board starts in ${fmtMonth(monthsWithData(tasks).at(-1) || month)}, so there is nothing earlier to compare against. As each month closes, its completed work stays here and this page fills in.`}
          </span>
        </p>
      )}

      <div className="cmp-kpis">
        {KPIS.map((k, i) => (
          <article key={k.key} className="card cmp-kpi hl rise" style={{ '--d': i + 2 }}>
            <header>
              <span className="stat-ic">
                <Icon name={k.icon} size={17} />
              </span>
              <small>{k.label}</small>
              <Delta a={sa[k.key]} b={sb[k.key]} points={k.points} />
            </header>
            <div className="cmp-pair">
              <div>
                <strong className="figure">{k.fmt(sa[k.key])}</strong>
                <span>{fmtMonth(a)}</span>
              </div>
              <div className="was">
                <strong className="figure">{k.fmt(sb[k.key])}</strong>
                <span>{fmtMonth(b)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <article className="card hl rise" style={{ '--d': 8 }}>
        <CardHead title={`Hours logged, 6 months to ${fmtMonth(a)}`} icon="chart" />
        <MonthBars
          data={trend}
          pinned={pin}
          onPin={setPin}
          fmt={hrs}
          labels={{ open: null, closed: 'hrs logged' }}
          tipTitle={(d) => `${fmtMonth(d.ym)} · ${d.done} done`}
        />
      </article>

      <div className="cmp-tables">
        <Breakdown
          by="Person"
          icon="users"
          rows={people}
          a={sa}
          b={sb}
          metric={personMetric}
          setMetric={setPersonMetric}
          renderName={(n) => (
            <span className="who sm">
              <Avatar person={n} size={24} />
              {n}
            </span>
          )}
        />
        <Breakdown
          by="Pillar"
          icon="layers"
          rows={pillars}
          a={sa}
          b={sb}
          metric={pillarMetric}
          setMetric={setPillarMetric}
          renderName={(n) => (
            <span className="who sm">
              <i className={`dot ${tone(n)}`} />
              {n}
            </span>
          )}
        />
      </div>
    </>
  )
}
