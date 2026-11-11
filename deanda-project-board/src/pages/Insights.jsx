import Icon from '../components/Icon'
import { Avatar, CardHead, PageHead, Prio, Stat } from '../components/ui'
import { PRIORITIES, TEAM } from '../data/board'
import { hrs, pts, todayISO } from '../lib/format'
import { HYGIENE, dueBucket, hoursPerPoint, isDone, isOpen } from '../lib/selectors'
import { useApp } from '../lib/store'

const sum = (l, f) => l.reduce((a, t) => a + (f(t) || 0), 0)

/** Analysis the sheet can’t show at a glance: estimates, priorities, due dates, data gaps. */
export default function Insights() {
  const { tasks, setPreset, go } = useApp()
  const today = todayISO()
  const both = tasks.filter((t) => isDone(t) && t.points > 0 && t.hours != null)
  const rate = hoursPerPoint(tasks)
  const buckets = ['Overdue', 'Today', 'This week', 'Later', 'No date'].map((b) => ({ b, list: tasks.filter((t) => dueBucket(t, today) === b) }))
  const count = (b) => buckets.find((x) => x.b === b).list.length
  const p0 = tasks.filter((t) => isOpen(t) && t.priority === 'P0')

  /* how many hours a story point takes each person, on Done tasks with both */
  const pace = TEAM.map((p) => {
    const l = both.filter((t) => t.owner === p.name)
    const points = sum(l, (t) => t.points)
    const hours = sum(l, (t) => t.hours)
    return { name: p.name, points, hours, rate: points ? hours / points : 0, n: l.length }
  }).filter((x) => x.n)
  const rMax = Math.max(0.01, ...pace.map((x) => x.rate))

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
        <Stat d={1} icon="target" label="Hours per story point" value={rate || 0} fmt={(v) => (rate == null ? '—' : `${hrs(v)}h`)} note={rate == null ? 'Shows once done tasks have story points' : `Across ${both.length} done tasks`} />
        <Stat d={2} icon="alert" label="Open and overdue" value={count('Overdue')} fmt={(v) => Math.round(v)} tone={count('Overdue') ? 'red' : undefined} />
        <Stat d={3} icon="calendar" label="Due in the next 7 days" value={count('Today') + count('This week')} fmt={(v) => Math.round(v)} />
        <Stat d={4} icon="flag" label="P0s still open" value={p0.length} fmt={(v) => Math.round(v)} />
      </div>

      <div className="ins-grid">
        <article className="card rise" style={{ '--d': 5 }}>
          <CardHead title="Hours per Story Point" />
          <p className="muted-line">Done tasks with both story points and hours</p>
          {pace.length === 0 && <p className="muted-line">Nothing yet. Give tasks story points and this fills in as they are closed.</p>}
          <ul className="pairs">
            {pace.map((x, i) => (
              <li key={x.name} style={{ '--i': i }}>
                <span className="who sm">
                  <Avatar person={x.name} size={24} />
                  {x.name}
                </span>
                <span className="pair-bars">
                  <i className="pr" style={{ width: `${(x.rate / rMax) * 100}%` }} />
                </span>
                <span className="pair-n">
                  <b>{hrs(x.rate)}h</b> / pt <em className="faint">· {pts(x.points)}</em>
                </span>
              </li>
            ))}
          </ul>
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
                <small>{pts(sum(b.list, (t) => t.points))}</small>
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
