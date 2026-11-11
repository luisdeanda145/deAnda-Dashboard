import { Fragment, useState } from 'react'
import Icon from '../components/Icon'
import { Avatar, PageHead, Prio, Segmented, Select, StatusPill, TaskDates } from '../components/ui'
import { ALL_PILLARS, TEAM, pillarTone } from '../data/board'
import { dayName, fmtDay, hrs, recencyRank, todayISO, weekName, weekStart } from '../lib/format'
import { HYGIENE, isDone } from '../lib/selectors'
import { useApp } from '../lib/store'

const COLS = [
  { id: 'title', label: 'Task' },
  { id: 'owner', label: 'Owner' },
  { id: 'pillar', label: 'Pillar / workstream' },
  { id: 'priority', label: 'Priority' },
  { id: 'status', label: 'Status' },
  { id: 'due', label: 'Date' },
  { id: 'points', label: 'Pts', num: true },
  { id: 'hours', label: 'Hrs', num: true },
]
const FILTERS = ['Open', 'Completed', 'All']
const ANY_OWNER = 'Everyone'
const ANY_PILLAR = 'All pillars'
const PAGE = 60

const CSV_COLS = ['owner', 'title', 'pillar', 'workstream', 'priority', 'status', 'due', 'completed', 'points', 'hours', 'notes']
const CSV_HEAD = ['Owner', 'Task', 'Pillar', 'Workstream', 'Priority', 'Status', 'Due Date', 'Completed Date', 'Story Points', 'Hours', 'Notes']
const cell = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))

/* the Date column sorts by the date that matters (Completed Date once Done, Due Date before),
   today first, then the rest of this week, then older weeks, then weeks still to come */
const dateOf = (t) => (isDone(t) ? t.completed : t.due)
const valueOf = (t, by) => (by === 'due' ? recencyRank(dateOf(t)) * 2 + (isDone(t) ? 1 : 0) : t[by]) // open before completed on the same day

/** The ToDo Feed: every row from every personal tab in one sortable table. */
export default function Tasks() {
  const { tasks, openTask, toast, preset, setPreset } = useApp()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState(preset ? 'All' : 'Open')
  const [owner, setOwner] = useState(ANY_OWNER)
  const [pillar, setPillar] = useState(ANY_PILLAR)
  const [rule, setRule] = useState(preset)
  const [sort, setSort] = useState({ by: 'due', dir: 1 })
  const [limit, setLimit] = useState(PAGE)
  const hygiene = HYGIENE.find((h) => h.id === rule)
  const today = todayISO()

  const s = q.trim().toLowerCase()
  const rows = tasks
    .filter(
      (t) =>
        (filter === 'All' || (filter === 'Completed') === isDone(t)) &&
        (owner === ANY_OWNER || t.owner === owner) &&
        (pillar === ANY_PILLAR || t.pillar === pillar) &&
        (!hygiene || hygiene.test(t)) &&
        (!s || `${t.title} ${t.notes || ''} ${t.pillar || ''} ${t.workstream || ''} ${t.owner}`.toLowerCase().includes(s)),
    )
    .sort((a, b) => {
      const x = valueOf(a, sort.by)
      const y = valueOf(b, sort.by)
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir
    })

  const by = (id) => setSort((o) => ({ by: id, dir: o.by === id ? -o.dir : id === 'points' || id === 'hours' ? -1 : 1 }))

  const exportCsv = () => {
    const body = [CSV_HEAD.join(','), ...rows.map((t) => CSV_COLS.map((c) => cell(t[c])).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }))
    a.download = 'todo-feed.csv'
    a.click()
    URL.revokeObjectURL(a.href)
    toast({ icon: 'download', title: 'Exported', text: `${rows.length} rows · todo-feed.csv` })
  }

  return (
    <>
      <PageHead title="All Tasks" sub={`${tasks.length} rows across ${TEAM.length} personal tabs`}>
        <label className="search">
          <Icon name="search" size={17} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks, notes, pillars" />
        </label>
        <button type="button" className="cta ghost" onClick={exportCsv}>
          <Icon name="download" size={17} /> Export
        </button>
      </PageHead>

      <div className="filter-bar rise" style={{ '--d': 1 }}>
        <div className="filters">
          <Segmented value={filter} options={FILTERS} onChange={setFilter} />
          <Select value={owner} options={[ANY_OWNER, ...TEAM.map((p) => p.name)]} onChange={setOwner} align="left" prefix={<Icon name="user" size={15} />} />
          <Select value={pillar} options={[ANY_PILLAR, ...ALL_PILLARS]} onChange={setPillar} align="left" prefix={<Icon name="layers" size={15} />} />
          {hygiene && (
            <button
              type="button"
              className="chip on"
              onClick={() => {
                setRule(null)
                setPreset(null)
              }}
            >
              {hygiene.label} <Icon name="close" size={13} stroke={2.4} />
            </button>
          )}
        </div>
        <span className="muted-line">{rows.length} shown</span>
      </div>

      <div className="card table-card rise" style={{ '--d': 2 }}>
        <div className="table-wrap">
          <table className="table tasks-table">
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th key={c.id} className={c.num ? 'num' : ''}>
                    <button type="button" onClick={() => by(c.id)} className={sort.by === c.id ? 'on' : ''}>
                      {c.label}
                      <Icon name={sort.by === c.id && sort.dir > 0 ? 'chevUp' : 'chevDown'} size={13} stroke={2.2} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((t, i, all) => {
                /* when sorted by date, a heading row opens each new day, naming its week */
                const day = sort.by === 'due' ? dateOf(t) || null : undefined
                const prev = i > 0 && sort.by === 'due' ? dateOf(all[i - 1]) || null : undefined
                const head = sort.by === 'due' && (i === 0 || day !== prev || isDone(t) !== isDone(all[i - 1]))
                return (
                  <Fragment key={t.id}>
                    {head && (
                      <tr className={`day-row${isDone(t) ? ' done' : day && day < today ? ' day-late' : ''}`}>
                        <td colSpan={COLS.length}>
                          {isDone(t) ? <Icon name="check" size={13} stroke={2.6} /> : <Icon name="calendar" size={13} />}
                          {isDone(t) ? 'Completed ' : day ? 'Due ' : ''}
                          {day ? dayName(day, today) : isDone(t) ? 'No completed date' : 'No due date'}
                          {day && <em>{weekName(weekStart(day), today) || `Week of ${fmtDay(weekStart(day))}`}</em>}
                        </td>
                      </tr>
                    )}
                    <tr className={isDone(t) ? 'row-done' : ''} style={{ '--i': Math.min(i, 20) }} onClick={() => openTask(t)}>
                      <td className="t-title">
                        <b>{t.title}</b>
                        {t.notes && <em>{t.notes}</em>}
                      </td>
                      <td>
                        <span className="who sm">
                          <Avatar person={t.owner} size={26} />
                          {t.owner}
                        </span>
                      </td>
                      <td className="t-pillar">
                        {t.pillar ? (
                          <>
                            <span>
                              <i className={`dot ${pillarTone(t.pillar)}`} /> {t.pillar}
                            </span>
                            <em>{t.workstream || 'No workstream'}</em>
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <Prio p={t.priority} />
                      </td>
                      <td>
                        <StatusPill status={t.status} />
                      </td>
                      <td className="t-date-cell">
                        <TaskDates t={t} stack />
                      </td>
                      <td className="num">{t.points ?? '—'}</td>
                      <td className="num">{hrs(t.hours)}</td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length > limit && (
          <button type="button" className="table-more" onClick={() => setLimit((l) => l + PAGE * 2)}>
            Show {Math.min(PAGE * 2, rows.length - limit)} more of {rows.length - limit}
          </button>
        )}
        {rows.length === 0 && <p className="empty">No tasks match these filters.</p>}
      </div>
    </>
  )
}
