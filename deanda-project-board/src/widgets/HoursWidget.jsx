import { PillBars } from '../components/Charts'
import { CardHead, Grip } from '../components/ui'
import { TEAM, USER } from '../data/board'
import { fmtMonth, hrs, todayISO } from '../lib/format'
import { useCountUp } from '../lib/hooks'
import { byPerson, loggedIn } from '../lib/selectors'
import { useApp } from '../lib/store'

/** The light-blue "sky" card: hours logged this month, one pill per teammate. */
export default function HoursWidget() {
  const { tasks, month, go } = useApp()
  const people = byPerson(tasks, month)
  const total = people.reduce((a, p) => a + p.hours, 0)
  const today = todayISO()
  const todayHrs = tasks.reduce((a, t) => a + (t.completed === today ? loggedIn(t, month) : 0), 0)
  const shown = useCountUp(total, 1300, 500)

  return (
    <section className="win widget contacts hl" style={{ '--n': 0 }}>
      {/* drifting pools of light; transform-only animation, so it stays on the compositor */}
      <span className="sky" aria-hidden="true">
        <i className="sky-a" />
        <i className="sky-b" />
        <i className="sky-c" />
        <i className="sky-sheen" />
      </span>
      <CardHead title="Hours Logged">
        <button type="button" className="grip-btn" aria-label="Open hours tracker" onClick={() => go('hours')}>
          <Grip />
        </button>
      </CardHead>
      <strong className="figure">
        {hrs(shown)}
        <small className="unit">hrs</small>
      </strong>
      <p className="sub">
        {hrs(todayHrs)} hrs today · {fmtMonth(month)}
      </p>
      <PillBars
        fmt={(v) => `${hrs(v)} hrs`}
        data={TEAM.map((p) => ({
          label: p.name,
          m: p.name[0],
          v: people.find((x) => x.name === p.name).hours,
          live: p.name === USER.name,
        }))}
      />
    </section>
  )
}
