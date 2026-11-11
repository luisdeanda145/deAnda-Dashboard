import { useState } from 'react'
import { AreaLine } from '../components/Charts'
import { CardHead, Select, Trend } from '../components/ui'
import { TEAM } from '../data/board'
import { daysInMonth, hrs, shortMonth, todayISO } from '../lib/format'
import { useCountUp } from '../lib/hooks'
import { dailyHours } from '../lib/selectors'
import { useApp } from '../lib/store'

const ALL = 'Whole team'

/** The dark card: hours logged per day this month as a line, for the team or one person. */
export default function HoursByDayWidget() {
  const { tasks, month } = useApp()
  const [who, setWho] = useState(ALL)
  const all = dailyHours(tasks, month, who === ALL ? null : who)
  const today = todayISO()
  /* plot up to today */
  const upto = today.startsWith(month) ? Number(today.slice(8, 10)) : daysInMonth(month)
  const points = all.slice(0, Math.max(2, upto))
  const last = points[points.length - 1]
  const avg = points.reduce((a, b) => a + b, 0) / Math.max(1, points.length)
  const shown = useCountUp(last, 1200, 800)
  const mon = shortMonth(month)
  const step = Math.max(1, Math.round(points.length / 4))
  const ticks = points.map((_, i) => i).filter((i) => i % step === 0).map((i) => `${i + 1} ${mon}`)

  return (
    <section className="win widget texts hl" style={{ '--n': 2 }}>
      <CardHead title="Hours By Day">
        <Select value={who} options={[ALL, ...TEAM.map((p) => p.name)]} onChange={setWho} small />
      </CardHead>
      <strong className="figure">
        {hrs(shown)}
        <small className="unit">hrs today</small>
      </strong>
      <p className="sub">
        {hrs(avg)} avg/day <Trend value={avg ? ((last - avg) / avg) * 100 : 0} digits={0} /> <span className="faint">today vs avg</span>
      </p>
      <AreaLine key={who} points={points} ticks={ticks} label={(i) => `${mon} ${i + 1}`} fmt={(v) => `${hrs(v)} hrs`} />
    </section>
  )
}
