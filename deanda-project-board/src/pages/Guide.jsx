import Icon from '../components/Icon'
import { PageHead } from '../components/ui'

const RULES = [
  {
    icon: 'target',
    title: 'Story points are effort, hours are time',
    text: 'Give each task story points for how big it is (1, 2, 3, 5, 8, 13), and log the Hours it actually took. Use quarter hours: 0.25, 0.5, 1.',
  },
  {
    icon: 'check',
    title: 'Hours count when a task is Done',
    text: 'Hours are credited to the day in Completed Date. Ticking a task off fills in today’s date for you and asks for the hours it took.',
  },
  {
    icon: 'circle',
    title: 'Open means not Done',
    text: 'Not started, In progress, Blocked and anything with no status all count as open, so Open can be more than the three lanes added up.',
  },
  {
    icon: 'layers',
    title: 'Pick a pillar and a workstream',
    text: 'The task then shows up on that pillar automatically. Personal / Admin, Bronx Future Stars and Other stay on your own tab only.',
  },
  {
    icon: 'alert',
    title: 'Say why something is blocked',
    text: 'Use Notes for who or what you’re waiting on. Blocked cards show their note on the Board so the team can unblock them.',
  },
  {
    icon: 'flag',
    title: 'Priorities',
    text: 'P0 is now, P1 is this week, P2 is normal, P3 is whenever there’s room.',
  },
]

export default function Guide() {
  return (
    <>
      <PageHead title="How It Works" sub="The same rules as the project board spreadsheet" />
      <div className="guide">
        {RULES.map((r, i) => (
          <article key={r.title} className="card hl rise" style={{ '--d': i + 1 }}>
            <span className="stat-ic">
              <Icon name={r.icon} size={18} />
            </span>
            <h3>{r.title}</h3>
            <p>{r.text}</p>
          </article>
        ))}
      </div>
      <div className="card keys rise" style={{ '--d': 8 }}>
        <span>
          <kbd>⌘</kbd>
          <kbd>K</kbd> Search tasks, people and pillars
        </span>
        <span>
          <kbd>N</kbd> New task
        </span>
        <span>
          <kbd>↵</kbd> Save a task
        </span>
        <span>
          <kbd>esc</kbd> Close a sheet
        </span>
      </div>
    </>
  )
}
