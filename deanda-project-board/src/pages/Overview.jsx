import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Donut, StackBar, TickBar } from '../components/Charts'
import { Avatar, CardHead, Select, Words } from '../components/ui'
import { STATUSES, USER } from '../data/board'
import { fmtMonth, greeting, num, pts } from '../lib/format'
import { useCountUp } from '../lib/hooks'
import { byPillar, isOpen, summary } from '../lib/selectors'
import { useApp } from '../lib/store'
import { DailyHoursTracker, WhereHoursWent } from '../components/HoursCards'

function Header() {
  const { openSheet, toast, month, go } = useApp()
  const [syncing, setSyncing] = useState(false)
  const [at, setAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [])

  const mins = Math.floor((now - at) / 60000)
  const ago = mins < 1 ? 'Just now' : `${mins} min ago`

  /* stand-in for a backend refresh (api.fetchTasks) */
  const sync = () => {
    if (syncing) return
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setAt(Date.now())
      setNow(Date.now())
      toast({ icon: 'sync', title: 'Board is up to date', text: 'Connect the backend to pull live changes' })
    }, 1200)
  }

  return (
    <header className="ov-head">
      <div>
        <h1 className="hello" aria-label={`${greeting()}, ${USER.name}`}>
          <Words text={`${greeting()}, ${USER.name}`} />
        </h1>
        <p className="rv" style={{ '--i': 3 }}>
          Where the team stands on the {fmtMonth(month)} board
        </p>
      </div>
      <div className="ov-tools rv" style={{ '--i': 4 }}>
        <button type="button" className="round-btn lg hl" aria-label="Search" onClick={() => openSheet('palette')}>
          <Icon name="search" size={20} stroke={1.9} />
        </button>
        <button type="button" className={`sync hl${syncing ? ' busy' : ''}`} onClick={sync}>
          <Icon name="sync" size={19} stroke={1.9} />
          <span>
            <small>Last sync</small>
            <b>{syncing ? 'Syncing…' : ago}</b>
          </span>
        </button>
        <button type="button" className="ov-me" aria-label="Settings" onClick={() => go('settings')}>
          <Avatar person={USER.name} size={42} />
        </button>
      </div>
    </header>
  )
}

function PointsCard({ s, ipSP }) {
  const pct = useCountUp(s.donePct, 1300, 350)
  const ip = s.planned ? (ipSP / s.planned) * 100 : 0
  const none = s.planned === 0
  return (
    <article className="card kpi-card hl rise" style={{ '--d': 5 }}>
      <CardHead title="Story Points Done" />
      <div className="kpi">
        <strong className="figure">{none ? '—' : `${pct.toFixed(1)}%`}</strong>
        <span className="kpi-note">{none ? 'No story points on tasks yet' : `${pts(s.completed)} of ${pts(s.planned)}`}</span>
      </div>
      <TickBar
        delay={0.35}
        segments={
          none
            ? [{ to: 100, tone: 'mute', label: 'Give tasks story points to track this' }]
            : [
                { to: s.donePct, tone: 'teal', label: `Done · ${pts(s.completed)}` },
                { to: s.donePct + ip, tone: 'blue', label: `In progress · ${pts(ipSP)}` },
                { to: 100, tone: 'mute', label: `Not started or blocked · ${pts(s.planned - s.completed - ipSP)}` },
              ]
        }
      />
    </article>
  )
}

function OpenCard({ s }) {
  const { go } = useApp()
  const n = useCountUp(s.open, 1000, 450)
  const o = s.open || 1
  const a = (s.inProgress / o) * 100
  const b = a + (s.notStarted / o) * 100
  return (
    <article className="card kpi-card hl rise" style={{ '--d': 6 }}>
      <CardHead title="Open Items" />
      <div className="kpi">
        <strong className="figure">{Math.round(n)}</strong>
        <button type="button" className="tag-red" onClick={() => go('board')}>
          {s.blocked} blocked
        </button>
        <span className="kpi-note">{num(s.closed)} closed</span>
      </div>
      <TickBar
        delay={0.45}
        segments={[
          { to: a, tone: 'blue', label: `In progress · ${s.inProgress}` },
          { to: b, tone: 'sky', label: `Not started · ${s.notStarted}` },
          { to: 100, tone: 'red', label: `Blocked · ${s.blocked}` },
        ]}
      />
    </article>
  )
}

const STATUS_RANGES = ['All tasks', 'Open only']

function StatusCard({ tasks }) {
  const [range, setRange] = useState('All tasks')
  const [active, setActive] = useState(null)
  const list = range === 'All tasks' ? tasks : tasks.filter(isOpen)
  const data = STATUSES.filter((st) => range === 'All tasks' || st.id !== 'Done')
    .map((st) => ({ id: st.id, label: st.id, tone: st.tone, value: list.filter((t) => t.status === st.id).length }))
    .filter((d) => d.value > 0)
  return (
    <article className="card hl rise" style={{ '--d': 2 }}>
      <CardHead title="Status Mix">
        <Select value={range} options={STATUS_RANGES} onChange={setRange} />
      </CardHead>
      <div className="types" key={range}>
        <Donut data={data} active={active} onActive={setActive} total={list.length} unit="tasks" />
        <div className="types-legend" onPointerLeave={() => setActive(null)}>
          {data.map((d) => (
            <div key={d.id} className={`tl-row${active && active !== d.id ? ' dim' : ''}`} onPointerEnter={() => setActive(d.id)}>
              <i className={`dot ${d.tone}`} />
              <span>{d.label}</span>
              <b className="tl-n">{d.value}</b>
            </div>
          ))}
          <small>{range === 'All tasks' ? 'Every row on the board' : 'Anything not marked Done'}</small>
        </div>
      </div>
    </article>
  )
}

const TONES = ['teal', 'blue', 'sky']

function PillarCard({ tasks }) {
  const { go, month } = useApp()
  const [active, setActive] = useState(-1)
  /* every task on this month's board, by pillar */
  const f = (p) => p.planned
  const pillars = byPillar(tasks).sort((a, b) => f(b) - f(a))
  const total = pillars.reduce((a, p) => a + f(p), 0) || 1
  const top = pillars.slice(0, 3)
  const rest = pillars.slice(3)
  const restV = rest.reduce((a, p) => a + f(p), 0)
  const fmt = num
  const rows = [
    ...top.map((p, i) => ({ name: p.name, email: p.blocked ? `${p.blocked} blocked` : `${p.owners.length} people`, tone: TONES[i], share: Math.round((f(p) / total) * 100), count: f(p) })),
    { name: `${rest.length} other pillars`, tone: 'hatch', share: Math.round((restV / total) * 100), count: restV },
  ]
  return (
    <article className="card hl rise" style={{ '--d': 3 }}>
      <CardHead title="Pillar Load">
        <span className="faint-note">All tasks · {fmtMonth(month)}</span>
      </CardHead>
      <div className="top">
        <StackBar rows={rows} active={active} onActive={setActive} />
        <ul className="top-list" onPointerLeave={() => setActive(-1)}>
          {rows.map((r, i) => (
            <li key={r.name} className={active >= 0 && active !== i ? 'dim' : ''} style={{ '--i': i }} onPointerEnter={() => setActive(i)} onClick={() => go('pillars')}>
              <i className={`dot ${r.tone}`} />
              <span className="tc-name">
                <b>{r.name}</b>
                {r.email && <em>{r.email}</em>}
              </span>
              <span className="tc-share">{r.share}%</span>
              <span className="tc-count">{fmt(r.count)}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export default function Overview() {
  const { tasks, month } = useApp()
  const s = summary(tasks, month)
  const ipSP = tasks.filter((t) => t.status === 'In progress').reduce((a, t) => a + (t.points || 0), 0)
  return (
    <div className="overview">
      <Header />
      <div className="ov-grid">
        <DailyHoursTracker tasks={tasks} month={month} delay={1} />
        <StatusCard tasks={tasks} />
        <PillarCard tasks={tasks} />
        <WhereHoursWent tasks={tasks} month={month} delay={4} />
        <PointsCard s={s} ipSP={ipSP} />
        <OpenCard s={s} />
      </div>
    </div>
  )
}
