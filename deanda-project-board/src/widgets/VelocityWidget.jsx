import { useState } from 'react'
import { AreaLine } from '../components/Charts'
import { CardHead, Select, Trend } from '../components/ui'
import { TEAM } from '../data/board'
import { daysInMonth, shortMonth, todayISO } from '../lib/format'
import { useCountUp } from '../lib/hooks'
import { dailyDone } from '../lib/selectors'
import { useApp } from '../lib/store'

const ALL = 'Whole team'

/** The dark card: tasks closed per day this month, for the team or one person. */
export default function VelocityWidget() {
  const { tasks, month } = useApp()
  const [who, setWho] = useState(ALL)
  const all = dailyDone(tasks, month, who === ALL ? null : who)
  const today = todayISO()
  /* only plot up to today when the board month is the current month */
  const upto = today.startsWith(month) ? Number(today.slice(8, 10)) : daysInMonth(month)
  const points = all.slice(0, Math.max(2, upto))
  const total = all.reduce((a, b) => a + b, 0)
  const last = points[points.length - 1]
  const avg = total / Math.max(1, points.length)
  const shown = useCountUp(total, 1200, 800)
  const mon = shortMonth(month)
  const step = Math.max(1, Math.round(points.length / 4))
  const ticks = points.map((_, i) => i).filter((i) => i % step === 0).map((i) => `${i + 1} ${mon}`)

  return (
    <section className="win widget texts hl" style={{ '--n': 2 }}>
      <CardHead title="Tasks Closed">
        <Select value={who} options={[ALL, ...TEAM.map((p) => p.name)]} onChange={setWho} small />
      </CardHead>
      <strong className="figure">{Math.round(shown)}</strong>
      <p className="sub">
        {last} {today.startsWith(month) ? 'today' : `on ${mon} ${upto}`} <Trend value={avg ? ((last - avg) / avg) * 100 : 0} digits={0} /> <span className="faint">vs daily avg</span>
      </p>
      <AreaLine key={who} points={points} ticks={ticks} label={(i) => `${mon} ${i + 1}`} fmt={(v) => `${v} closed`} />
    </section>
  )
}
