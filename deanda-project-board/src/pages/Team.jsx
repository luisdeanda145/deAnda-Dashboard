import Icon from '../components/Icon'
import { Avatar, CardHead, PageHead } from '../components/ui'
import { fmtMonth, hrs } from '../lib/format'
import { byPerson } from '../lib/selectors'
import { useApp } from '../lib/store'

function accuracyLabel(a) {
  if (a == null) return { text: 'No hours logged yet', tone: 'mute' }
  const d = Math.round((a - 1) * 100)
  if (Math.abs(d) <= 10) return { text: 'On estimate', tone: 'teal' }
  return d > 0 ? { text: `Runs ${d}% over estimate`, tone: 'amber' } : { text: `${-d}% under estimate`, tone: 'blue' }
}

/** Overview → BY PERSON, as a card per teammate plus the full table. */
export default function Team() {
  const { tasks, month, setMe, go } = useApp()
  const people = byPerson(tasks, month)
  const maxH = Math.max(1, ...people.map((p) => p.hours))
  const view = (name) => {
    setMe(name)
    go('mine')
  }

  return (
    <>
      <PageHead title="Team" sub={`${people.length} people · hours credited in ${fmtMonth(month)}`} />

      <div className="team-grid">
        {people.map((p, i) => {
          const acc = accuracyLabel(p.accuracy)
          const tot = p.planned || 1
          return (
            <article key={p.name} className="card person hl rise" style={{ '--d': i + 1 }}>
              <header>
                <Avatar person={p.name} size={44} />
                <div>
                  <b>{p.name}</b>
                  <small>{p.role}</small>
                </div>
                <button type="button" className="round-btn" aria-label={`Open ${p.name}’s tab`} data-tip="Open tab" onClick={() => view(p.name)}>
                  <Icon name="arrowRight" size={16} stroke={2} />
                </button>
              </header>
              <div className="person-hrs">
                <strong className="figure">{hrs(p.hours)}</strong>
                <span>hrs logged</span>
                <span className="meter">
                  <i style={{ width: `${(p.hours / maxH) * 100}%` }} />
                </span>
              </div>
              <div className="mini-stack" aria-label="Tasks by status">
                <i className="teal" style={{ flexGrow: p.completed }} title={`Done ${p.completed}`} />
                <i className="blue" style={{ flexGrow: p.inProgress }} title={`In progress ${p.inProgress}`} />
                <i className="sky" style={{ flexGrow: p.notStarted }} title={`Not started ${p.notStarted}`} />
                <i className="red" style={{ flexGrow: p.blocked }} title={`Blocked ${p.blocked}`} />
                {p.planned === 0 && <i className="none" style={{ flexGrow: 1 }} />}
              </div>
              <dl className="person-stats">
                <div>
                  <dt>Tasks</dt>
                  <dd>{p.planned}</dd>
                </div>
                <div>
                  <dt>Done</dt>
                  <dd>{Math.round((p.completed / tot) * 100)}%</dd>
                </div>
                <div>
                  <dt>Open</dt>
                  <dd>{p.planned - p.completed}</dd>
                </div>
                <div className={p.blocked ? 'warn' : ''}>
                  <dt>Blocked</dt>
                  <dd>{p.blocked}</dd>
                </div>
              </dl>
              <span className={`acc tone-${acc.tone}`}>
                <Icon name="target" size={14} /> {acc.text}
              </span>
            </article>
          )
        })}
      </div>

      <div className="card table-card rise" style={{ '--d': 9 }}>
        <CardHead title="By Person" />
        <div className="table-wrap">
          <table className="table compact">
            <thead>
              <tr>
                <th>Owner</th>
                <th className="num">Planned</th>
                <th className="num">Completed</th>
                <th className="num">In progress</th>
                <th className="num">Not started</th>
                <th className="num">Blocked</th>
                <th className="num">Planned hrs</th>
                <th className="num">Completed hrs</th>
                <th className="num">Logged (month)</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p, i) => (
                <tr key={p.name} style={{ '--i': i }} onClick={() => view(p.name)}>
                  <td>
                    <span className="who sm">
                      <Avatar person={p.name} size={26} />
                      {p.name}
                    </span>
                  </td>
                  <td className="num">{p.planned}</td>
                  <td className="num">{p.completed}</td>
                  <td className="num">{p.inProgress}</td>
                  <td className="num">{p.notStarted}</td>
                  <td className={`num${p.blocked ? ' late' : ''}`}>{p.blocked}</td>
                  <td className="num">{hrs(p.plannedSP)}</td>
                  <td className="num">{hrs(p.completedSP)}</td>
                  <td className="num">
                    <b>{hrs(p.hours)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Team</td>
                {['planned', 'completed', 'inProgress', 'notStarted', 'blocked'].map((k) => (
                  <td key={k} className="num">
                    {people.reduce((a, p) => a + p[k], 0)}
                  </td>
                ))}
                {['plannedSP', 'completedSP', 'hours'].map((k) => (
                  <td key={k} className="num">
                    {hrs(people.reduce((a, p) => a + p[k], 0))}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  )
}
