import Icon from '../components/Icon'
import { Avatar, PageHead, Switch } from '../components/ui'
import { DEFAULTS } from '../lib/settings'
import { PILLARS, TEAM, USER, WORKSTREAMS } from '../data/board'
import { fmtMonth } from '../lib/format'
import { focusOf } from '../lib/selectors'
import { useApp } from '../lib/store'

function Slider({ label, hint, value, min, max, step = 1, unit = '', onChange }) {
  const p = ((value - min) / (max - min)) * 100
  return (
    <label className="slider">
      <span className="slider-top">
        <b>{label}</b>
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} style={{ '--p': `${p}%` }} onChange={(e) => onChange(+e.target.value)} />
      {hint && <small>{hint}</small>}
    </label>
  )
}

export default function Settings() {
  const { settings, set, toast, month, setMonth, tasks, manage, removePerson, removePillar, removeWorkstream } = useApp()
  /* removals refuse while tasks still point at the thing; say why */
  const attempt = (problem, done) => toast(problem ? { icon: 'alert', title: 'Can’t remove yet', text: problem } : { icon: 'trash', title: 'Removed', text: done })

  return (
    <>
      <PageHead title="Settings" sub="The board, the team and the space around you">
        <button
          type="button"
          className="cta ghost"
          onClick={() => {
            set(DEFAULTS)
            toast({ icon: 'sync', title: 'Defaults restored' })
          }}
        >
          Reset view
        </button>
      </PageHead>

      <div className="set-grid">
        <section className="card set-group rise" style={{ '--d': 1 }}>
          <h2>
            <Icon name="calendar" size={18} /> Board
          </h2>
          <div className="set-row">
            <div>
              <b>Reporting month</b>
              <small>Hours and “done this month” use {fmtMonth(month)}</small>
            </div>
            <input type="month" className="date-in" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </div>
          <div className="set-row">
            <div>
              <b>Data source</b>
              <small>{tasks.length} tasks from Project_Board_Nov_2026.xlsx, kept in memory</small>
            </div>
            <span className="status tone-amber">Local</span>
          </div>
          <div className="set-row">
            <div>
              <b>Backend</b>
              <small>Set VITE_API_URL and fill in src/lib/api.js</small>
            </div>
            <button type="button" className="chip" onClick={() => toast({ icon: 'apps', title: 'Not connected yet', text: 'See src/lib/api.js' })}>
              Connect
            </button>
          </div>
        </section>

        <section className="card set-group rise" style={{ '--d': 2 }}>
          <h2>
            <Icon name="cube" size={18} /> Spatial layout
          </h2>
          <Slider label="Curvature" hint="How far the side panels wrap around you. You can also drag the window bar." value={settings.curve} min={0} max={28} unit="°" onChange={(curve) => set({ curve })} />
          <Slider label="Depth" hint="Lower is closer, with a stronger 3D effect." value={settings.depth} min={900} max={3200} step={50} unit="px" onChange={(depth) => set({ depth })} />
        </section>

        <section className="card set-group rise" style={{ '--d': 3 }}>
          <h2>
            <Icon name="sparkle" size={18} /> Glass & motion
          </h2>
          <Slider label="Frost" hint="Background blur behind every window." value={settings.frost} min={6} max={70} unit="px" onChange={(frost) => set({ frost })} />
          <Slider label="Tint" hint="Darker glass keeps text legible on bright scenes." value={settings.tint} min={0} max={70} unit="%" onChange={(tint) => set({ tint })} />
          <div className="set-row">
            <div>
              <b>Animations</b>
              <small>Entrances, count-ups and transitions</small>
            </div>
            <Switch on={settings.motion} onChange={(motion) => set({ motion })} label="Animations" />
          </div>
        </section>

        <section className="card set-group rise" style={{ '--d': 4 }}>
          <h2>
            <Icon name="users" size={18} /> Team
            <button type="button" className="chip sm-chip set-add" onClick={() => manage('person')}>
              <Icon name="plus" size={14} stroke={2.2} /> Add member
            </button>
          </h2>
          <ul className="roster">
            {TEAM.map((p) => (
              <li key={p.name}>
                <Avatar person={p.name} size={30} />
                <div>
                  <b>
                    {p.name}
                    {p.name === USER.name && <em> · you</em>}
                  </b>
                  <small>{p.role || focusOf(tasks, p.name)}</small>
                </div>
                {p.name !== USER.name && (
                  <button type="button" className="x-btn" aria-label={`Remove ${p.name}`} data-tip="Remove" onClick={() => attempt(removePerson(p.name), p.name)}>
                    <Icon name="close" size={13} stroke={2.2} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card set-group wide rise" style={{ '--d': 5 }}>
          <h2>
            <Icon name="layers" size={18} /> Pillars & workstreams
            <button type="button" className="chip sm-chip set-add" onClick={() => manage('pillar')}>
              <Icon name="plus" size={14} stroke={2.2} /> Add pillar
            </button>
          </h2>
          <div className="pw-grid">
            {PILLARS.map((p) => (
              <div key={p.name}>
                <b>
                  <i className={`dot ${p.tone}`} /> {p.name}
                  <button type="button" className="x-btn" aria-label={`Remove ${p.name}`} data-tip="Remove pillar" onClick={() => attempt(removePillar(p.name), p.name)}>
                    <Icon name="close" size={13} stroke={2.2} />
                  </button>
                </b>
                <span className="tags">
                  {WORKSTREAMS.filter((w) => w.pillar === p.name).map((w) => (
                    <i key={w.name} className="tag-x">
                      {w.name}
                      <button type="button" aria-label={`Remove ${w.name}`} onClick={() => attempt(removeWorkstream(w), w.name)}>
                        <Icon name="close" size={11} stroke={2.4} />
                      </button>
                    </i>
                  ))}
                  <button type="button" className="tag-add" onClick={() => manage('workstream', { pillar: p.name })}>
                    <Icon name="plus" size={12} stroke={2.4} /> Workstream
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
