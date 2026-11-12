import { PillBars } from '../components/Charts'
import { CardHead, Grip } from '../components/ui'
import { TEAM, USER } from '../data/board'
import { fmtMonth, hrs, todayISO } from '../lib/format'
import { useCountUp } from '../lib/hooks'
import { byPerson, loggedIn } from '../lib/selectors'
import { useApp } from '../lib/store'

/* Each cloud: size, place, colour, and three motions on separate loops that never line up:
   a wandering path (--p1…--p4, --dt), a slow swirl around an off-centre point (--o, --ot, --dir)
   and a stretch (--sx, --sy, --bt). */
const CLOUDS = [
  { '--w': '78%', '--h': '58%', '--x': '-22%', '--y': '-24%', '--c': 'rgb(240 250 255 / 0.78)', '--p1': '18% 10%', '--p2': '34% 32%', '--p3': '8% 44%', '--p4': '-6% 18%', '--dt': '10.5s', '--o': '70% 120%', '--ot': '23s', '--dir': 'normal', '--sx': 1.3, '--sy': 0.8, '--bt': '5.5s' },
  { '--w': '64%', '--h': '50%', '--x': '48%', '--y': '8%', '--c': 'rgb(150 238 255 / 0.7)', '--p1': '-26% 14%', '--p2': '-40% -12%', '--p3': '-12% -26%', '--p4': '6% 8%', '--dt': '8.5s', '--o': '-20% 50%', '--ot': '29s', '--dir': 'reverse', '--sx': 0.8, '--sy': 1.3, '--bt': '4.5s' },
  { '--w': '90%', '--h': '46%', '--x': '-10%', '--y': '64%', '--c': 'rgb(52 84 222 / 0.55)', '--p1': '16% -10%', '--p2': '-8% -24%', '--p3': '22% -6%', '--p4': '4% 6%', '--dt': '13s', '--o': '50% -60%', '--ot': '32s', '--dir': 'normal', '--sx': 1.2, '--sy': 0.85, '--bt': '6.5s' },
  { '--w': '46%', '--h': '40%', '--x': '20%', '--y': '28%', '--c': 'rgb(205 236 255 / 0.62)', '--p1': '40% -20%', '--p2': '64% 18%', '--p3': '20% 40%', '--p4': '-18% 12%', '--dt': '9.5s', '--o': '120% 30%', '--ot': '19s', '--dir': 'reverse', '--sx': 1.4, '--sy': 0.75, '--bt': '4s' },
  { '--w': '52%', '--h': '44%', '--x': '58%', '--y': '58%', '--c': 'rgb(120 205 255 / 0.6)', '--p1': '-30% -30%', '--p2': '-60% -8%', '--p3': '-36% 14%', '--p4': '-8% -14%', '--dt': '11.5s', '--o': '-40% -20%', '--ot': '26s', '--dir': 'normal', '--sx': 0.85, '--sy': 1.25, '--bt': '5s' },
  { '--w': '38%', '--h': '34%', '--x': '-6%', '--y': '34%', '--c': 'rgb(230 247 255 / 0.55)', '--p1': '50% 20%', '--p2': '90% -10%', '--p3': '60% -40%', '--p4': '20% -16%', '--dt': '7.5s', '--o': '150% 60%', '--ot': '17s', '--dir': 'normal', '--sx': 1.35, '--sy': 0.9, '--bt': '3.5s' },
  { '--w': '58%', '--h': '42%', '--x': '30%', '--y': '-18%', '--c': 'rgb(170 225 255 / 0.5)', '--p1': '-20% 30%', '--p2': '10% 56%', '--p3': '34% 26%', '--p4': '12% -6%', '--dt': '14s', '--o': '50% 160%', '--ot': '35s', '--dir': 'reverse', '--sx': 1.15, '--sy': 1.3, '--bt': '6s' },
]

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
      {/* clouds of colour that wander, swirl and stretch like powder settling in water;
          transform-only animation, so it stays on the compositor */}
      <span className="sky" aria-hidden="true">
        {CLOUDS.map((c, i) => (
          <i key={i} className="cloud" style={c} />
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
