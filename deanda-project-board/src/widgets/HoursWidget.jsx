import { PillBars } from '../components/Charts'
import { CardHead, Grip } from '../components/ui'
import { TEAM, USER } from '../data/board'
import { fmtMonth, hrs, todayISO } from '../lib/format'
import { useCountUp } from '../lib/hooks'
import { byPerson, loggedIn } from '../lib/selectors'
import { useApp } from '../lib/store'

/* left %, size, rise time, start delay: spread out so they never move in step */
const BUBBLES = [
  [8, 7, 11, 0],
  [21, 11, 14, 4],
  [37, 6, 10, 7],
  [52, 9, 13, 2],
  [66, 5, 9, 5.5],
  [79, 12, 16, 1],
  [91, 7, 12, 8],
]

/** The light-blue "tide" card: hours logged this month, one pill per teammate. */
export default function HoursWidget() {
  const { tasks, month, go } = useApp()
  const people = byPerson(tasks, month)
  const total = people.reduce((a, p) => a + p.hours, 0)
  const today = todayISO()
  const todayHrs = tasks.reduce((a, t) => a + (t.completed === today ? loggedIn(t, month) : 0), 0)
  const shown = useCountUp(total, 1300, 500)

  return (
    <section className="win widget contacts hl" style={{ '--n': 0 }}>
      {/* a light-blue tide: three wave layers rolling at different speeds, bubbles rising
          through them, a glow from above. Transform-only animation, so it stays on the compositor. */}
      <span className="sky" aria-hidden="true">
        <i className="sky-glow" />
        <i className="wave w3" />
        <i className="wave w2" />
        <i className="wave w1" />
        {BUBBLES.map((b, i) => (
          <i key={i} className="bubble" style={{ '--x': `${b[0]}%`, '--s': `${b[1]}px`, '--t': `${b[2]}s`, '--w': `${b[3]}s` }} />
        ))}
      </span>
      <CardHead title="Hours Logged">
        <button type="button" className="grip-btn" aria-label="Open the daily hours tracker" onClick={() => go('overview')}>
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
