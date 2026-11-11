import { useState } from 'react'
import Icon from '../components/Icon'
import { CardHead, Faces, PageHead, Segmented } from '../components/ui'
import { WORKSTREAMS } from '../data/board'
import { hrs, pts } from '../lib/format'
import { byPillar, byWorkstream, isOpen } from '../lib/selectors'
import { useApp } from '../lib/store'
import { TaskRow } from './MyWork'

const SORTS = ['Open', 'Hours', 'A–Z']

/** One tab per pillar, as on the sheet: progress, workstreams and the open work. */
export default function Pillars() {
  const { tasks, openTask, manage } = useApp()
  const [sort, setSort] = useState('Open')
  const all = byPillar(tasks)
  const list = [...all].sort((a, b) => (sort === 'Open' ? b.open - a.open : sort === 'Hours' ? b.hours - a.hours : a.name.localeCompare(b.name)))
  const [pick, setPick] = useState(() => [...all].sort((a, b) => b.open - a.open)[0].name)
  const p = all.find((x) => x.name === pick) || all[0] // the picked pillar may have been removed
  const ws = byWorkstream(tasks, p.name)
  const wsMax = Math.max(1, ...ws.map((w) => w.planned))
  const open = p.tasks.filter(isOpen).sort((a, b) => (a.priority || 'P9').localeCompare(b.priority || 'P9') || (a.due || '9').localeCompare(b.due || '9'))
  const pct = p.planned ? (p.completed / p.planned) * 100 : 0

  return (
    <>
      <PageHead title="Pillars" sub="Every pillar tab on the board, with its workstreams">
        <Segmented value={sort} options={SORTS} onChange={setSort} />
        <button type="button" className="cta" onClick={() => manage('pillar')}>
          <Icon name="plus" size={16} stroke={2.2} /> Add pillar
        </button>
      </PageHead>

      <div className="pillars">
        <ul className="pl-list">
          {list.map((x, i) => {
            const done = x.planned ? (x.completed / x.planned) * 100 : 0
            return (
              <li key={x.name} style={{ '--d': i + 1 }} className="rise">
                <button type="button" className={`pl-row hl${x.name === pick ? ' on' : ''}`} onClick={() => setPick(x.name)}>
                  <span className={`pl-logo tone-${x.tone}`}>{x.code}</span>
                  <span className="pl-main">
                    <b>{x.name}</b>
                    <span className="meter">
                      <i style={{ width: `${done}%` }} />
                    </span>
                  </span>
                  <span className="pl-n">
                    <b>{x.open}</b>
                    <small>open</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="pl-detail" key={p.name}>
          <article className="card pl-head rise" style={{ '--d': 2 }}>
            <header>
              <span className={`pl-logo lg tone-${p.tone}`}>{p.code}</span>
              <div>
                <h2>{p.name}</h2>
                <p>{p.blurb}</p>
              </div>
              <Faces names={p.owners} />
            </header>
            <div className="pl-stats">
              <div>
                <small>Planned</small>
                <b>{p.planned}</b>
              </div>
              <div>
                <small>Done</small>
                <b>{p.completed}</b>
              </div>
              <div>
                <small>Active</small>
                <b>{p.inProgress}</b>
              </div>
              <div className={p.blocked ? 'warn' : ''}>
                <small>Blocked</small>
                <b>{p.blocked}</b>
              </div>
              <div>
                <small>Story pts</small>
                <b>{hrs(p.points)}</b>
              </div>
              <div>
                <small>Hours</small>
                <b>{hrs(p.hours)}</b>
              </div>
            </div>
            <div className="pl-prog">
              <span className="meter big">
                <i style={{ width: `${pct}%` }} />
              </span>
              <span>{Math.round(pct)}% of tasks done</span>
            </div>
          </article>

          <article className="card rise" style={{ '--d': 3 }}>
            <CardHead title="By Workstream">
              <button type="button" className="chip sm-chip" onClick={() => manage('workstream', { pillar: p.name })}>
                <Icon name="plus" size={14} stroke={2.2} /> Add workstream
              </button>
            </CardHead>
            {ws.length === 0 && <p className="muted-line">No workstreams with tasks yet.</p>}
            {(() => {
              const idle = WORKSTREAMS.filter((w) => w.pillar === p.name && !ws.some((x) => x.name === w.name))
              return idle.length > 0 && <p className="ws-idle">No tasks yet: {idle.map((w) => w.name).join(', ')}</p>
            })()}
            <ul className="ws-bars">
              {ws.map((w, i) => (
                <li key={w.name} style={{ '--i': i }}>
                  <span className="ws-name">{w.name}</span>
                  <span className="ws-track">
                    <i className="ws-done" style={{ width: `${(w.completed / wsMax) * 100}%` }} />
                    <i className="ws-open" style={{ width: `${(w.open / wsMax) * 100}%` }} />
                  </span>
                  <span className="ws-n">
                    {w.completed}/{w.planned}
                  </span>
                  <span className="ws-h">{pts(w.points)}</span>
                </li>
              ))}
            </ul>
            {ws.length > 0 && (
              <div className="legend ws-legend">
                <span>
                  <i className="dot teal" /> Done
                </span>
                <span>
                  <i className="ring" /> Open
                </span>
                <span className="faint">Count · story points</span>
              </div>
            )}
          </article>

          <section className="task-group">
            <h2 className="rise" style={{ '--d': 4 }}>
              Open work <span>{open.length}</span>
              <button type="button" className="chip sm-chip" onClick={() => openTask({ pillar: p.name })}>
                <Icon name="plus" size={14} stroke={2.2} /> Add to {p.name}
              </button>
            </h2>
            <ul>
              {open.slice(0, 40).map((t, i) => (
                <TaskRow key={t.id} t={t} d={Math.min(5 + i, 16)} showOwner />
              ))}
            </ul>
            {open.length === 0 && <p className="muted-line">Everything on this pillar is done.</p>}
          </section>
        </div>
      </div>
    </>
  )
}
