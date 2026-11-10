import { PillBars } from '../components/Charts'
import { CardHead, Grip } from '../components/ui'
import { TEAM, USER } from '../data/board'
import { fmtMonth, hrs, todayISO } from '../lib/format'
import { useCountUp } from '../lib/hooks'
import { byPerson, loggedIn } from '../lib/selectors'
import { useApp } from '../lib/store'

/** The blue "water" card: hours logged this month, one pill per teammate. */
export default function HoursWidget() {
  const { tasks, month, go } = useApp()
  const people = byPerson(tasks, month)
  const total = people.reduce((a, p) => a + p.hours, 0)
  const today = todayISO()
  const todayHrs = tasks.reduce((a, t) => a + (t.completed === today ? loggedIn(t, month) : 0), 0)
  const shown = useCountUp(total, 1300, 500)

  return (
    <section className="win widget contacts hl" style={{ '--n': 0 }}>
      <i className="water" aria-hidden="true" />
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
