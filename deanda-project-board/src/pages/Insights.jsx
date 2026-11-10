import Icon from '../components/Icon'
import { Avatar, CardHead, PageHead, Prio, Stat } from '../components/ui'
import { PRIORITIES, TEAM } from '../data/board'
import { hrs, todayISO } from '../lib/format'
import { HYGIENE, dueBucket, isDone, isOpen } from '../lib/selectors'
import { useApp } from '../lib/store'

const sum = (l, f) => l.reduce((a, t) => a + (f(t) || 0), 0)

/** Analysis the sheet can’t show at a glance: estimates, priorities, due dates, data gaps. */
export default function Insights() {
  const { tasks, setPreset, go } = useApp()
  const today = todayISO()
  const both = tasks.filter((t) => isDone(t) && t.est > 0 && t.real != null)
  const ratio = sum(both, (t) => t.real) / (sum(both, (t) => t.est) || 1)
  const buckets = ['Overdue', 'Today', 'This week', 'Later', 'No date'].map((b) => ({ b, list: tasks.filter((t) => dueBucket(t, today) === b) }))
  const count = (b) => buckets.find((x) => x.b === b).list.length
  const p0 = tasks.filter((t) => isOpen(t) && t.priority === 'P0')

  const est = TEAM.map((p) => {
    const l = both.filter((t) => t.owner === p.name)
    return { name: p.name, est: sum(l, (t) => t.est), real: sum(l, (t) => t.real), n: l.length }
  }).filter((x) => x.n)
  const eMax = Math.max(1, ...est.flatMap((x) => [x.est, x.real]))

  const prios = [...PRIORITIES.map((p) => p.id), null].map((id) => {
    const l = tasks.filter((t) => (t.priority || null) === id)
    return { id, open: l.filter(isOpen).length, done: l.filter(isDone).length }
  })
  const prMax = Math.max(1, ...prios.map((p) => p.open + p.done))
  const bMax = Math.max(1, ...buckets.map((b) => b.list.length))

  const review = (id) => {
    setPreset(id)
    go('tasks')
  }

  return (
    <>
      <PageHead title="Insights" sub="How the board is really running" />

      <div className="stats">
        <Stat d={1} icon="target" label="Real ÷ estimated hours" value={ratio * 100} fmt={(v) => `${Math.round(v)}%`} note={Math.abs(ratio - 1) <= 0.05 ? 'Estimates are on target' : ratio > 1 ? 'Tasks run longer than planned' : 'Tasks come in under estimate'} />
        <Stat d={2} icon="alert" label="Open and overdue" value={count('Overdue')} fmt={(v) => Math.round(v)} tone={count('Overdue') ? 'red' : undefined} />
        <Stat d={3} icon="calendar" label="Due in the next 7 days" value={count('Today') + count('This week')} fmt={(v) => Math.round(v)} />
        <Stat d={4} icon="flag" label="P0s still open" value={p0.length} fmt={(v) => Math.round(v)} />
      </div>

      <div className="ins-grid">
        <article className="card rise" style={{ '--d': 5 }}>
          <CardHead title="Estimate vs Actual" />
          <p className="muted-line">Done tasks with both estimate and real hours</p>
          <ul className="pairs">
            {est.map((x, i) => (
              <li key={x.name} style={{ '--i': i }}>
                <span className="who sm">
                  <Avatar person={x.name} size={24} />
                  {x.name}
                </span>
                <span className="pair-bars">
                  <i className="pe" style={{ width: `${(x.est / eMax) * 100}%` }} />
                  <i className="pr" style={{ width: `${(x.real / eMax) * 100}%` }} />
                </span>
                <span className="pair-n">
                  <b>{hrs(x.real)}</b> / {hrs(x.est)}h
                </span>
              </li>
            ))}
          </ul>
          <div className="legend">
            <span>
              <i className="ring" /> Estimated
            </span>
            <span>
              <i className="dot blue" /> Real
            </span>
          </div>
        </article>

        <article className="card rise" style={{ '--d': 6 }}>
          <CardHead title="Due Date Health" />
          <p className="muted-line">Open tasks by when they’re due</p>
          <ul className="rep-funnel-list">
            {buckets.map((b, i) => (
              <li key={b.b} style={{ '--i': i }}>
                <span>{b.b}</span>
                <div className="funnel-track">
                  <i className={b.b === 'Overdue' ? 'red' : b.b === 'No date' ? 'mute' : b.b === 'Later' ? 'sky' : 'blue'} style={{ width: `${(b.list.length / bMax) * 100}%` }} />
                </div>
                <b>{b.list.length}</b>
                <small>{hrs(sum(b.list, (t) => t.est))}h</small>
              </li>
            ))}
          </ul>
        </article>

        <article className="card rise" style={{ '--d': 7 }}>
          <CardHead title="Priority Mix" />
          <ul className="prio-rows">
            {prios.map((p, i) => (
              <li key={p.id || 'none'} style={{ '--i': i }}>
                <Prio p={p.id} />
                <span className="ws-track">
                  <i className="ws-done" style={{ width: `${(p.done / prMax) * 100}%` }} />
                  <i className="ws-open" style={{ width: `${(p.open / prMax) * 100}%` }} />
                </span>
                <span className="ws-n">
                  {p.open} open <em className="faint">· {p.done} done</em>
                </span>
              </li>
            ))}
          </ul>
          <div className="legend">
            <span>
              <i className="dot teal" /> Done
            </span>
            <span>
              <i className="ring" /> Open
            </span>
          </div>
        </article>

        <article className="card rise" style={{ '--d': 8 }}>
          <CardHead title="Data Hygiene" icon="sparkle" />
          <p className="muted-line">Rows the sheet’s formulas can’t count properly</p>
          <ul className="hyg">
            {HYGIENE.map((h) => {
              const n = tasks.filter(h.test).length
              return (
                <li key={h.id}>
                  <span className={`hyg-n${n ? '' : ' ok'}`}>{n ? n : <Icon name="check" size={14} stroke={2.6} />}</span>
                  <div>
                    <b>{h.label}</b>
                    <small>{h.hint}</small>
                  </div>
                  {n > 0 && (
                    <button type="button" className="chip" onClick={() => review(h.id)}>
                      Review
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </article>
      </div>
    </>
  )
}
