import { useState } from 'react'
import Icon from './Icon'
import { Avatar, Segmented, Select } from './ui'
import { ALL_PILLARS, PRIORITIES, STATUSES, TEAM, USER, workstreamsFor } from '../data/board'
import { todayISO } from '../lib/format'
import { useApp } from '../lib/store'

const NONE = '—'
/** the usual story-point scale */
const POINTS = [NONE, '1', '2', '3', '5', '8', '13']
const blank = (me) => ({
  title: '',
  owner: me,
  pillar: null,
  workstream: null,
  priority: 'P1',
  status: 'Not started',
  due: todayISO(),
  completed: null,
  points: null,
  hours: null,
  notes: '',
})

function Field({ label, children, wide }) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Hours({ value, onChange, label }) {
  const step = (d) => onChange(Math.max(0, Math.round(((value || 0) + d) * 100) / 100))
  return (
    <div className="hours-in">
      <button type="button" aria-label={`Less ${label}`} onClick={() => step(-0.25)}>
        −
      </button>
      <input
        type="number"
        min="0"
        step="0.25"
        inputMode="decimal"
        value={value ?? ''}
        placeholder="0"
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
      <em>hrs</em>
      <button type="button" aria-label={`More ${label}`} onClick={() => step(0.25)}>
        +
      </button>
    </div>
  )
}

/** Create or edit one row of the board — every column of a personal tab. */
export default function TaskSheet({ task, hint, onClose }) {
  const { addTask, patchTask, removeTask, toast, me } = useApp()
  const isNew = !task.id
  const [t, setT] = useState(() => ({ ...blank(me || USER.name), ...task }))
  const [err, setErr] = useState('')
  const put = (patch) => setT((x) => ({ ...x, ...patch }))

  const setStatus = (status) =>
    put(status === 'Done' ? { status, completed: t.completed || todayISO() } : { status, completed: null })

  const save = async (e) => {
    e?.preventDefault()
    if (!t.title.trim()) {
      setErr('Give the task a name')
      return
    }
    const clean = { ...t, title: t.title.trim(), notes: t.notes?.trim() || null }
    delete clean.fresh
    delete clean.moved
    if (isNew) {
      addTask(clean)
      toast({ icon: 'plus', title: 'Task added', text: `${clean.owner} · ${clean.pillar || 'No pillar'}` })
    } else {
      patchTask(t.id, clean)
      toast({ icon: 'check', title: 'Saved', text: clean.title })
    }
    onClose()
  }

  const del = () => {
    removeTask(t.id)
    toast({ icon: 'trash', title: 'Task deleted', text: t.title })
    onClose()
  }

  const wsOptions = [NONE, ...workstreamsFor(t.pillar)]

  return (
    <div className="sheet-wrap" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet task-sheet" role="dialog" aria-label={isNew ? 'New task' : 'Edit task'} onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && !e.currentTarget.querySelector('.select.open') && onClose()}>
        <header>
          <span className="tu-ic">
            <Icon name={isNew ? 'plus' : 'edit'} size={21} />
          </span>
          <div>
            <h2>{isNew ? 'New task' : 'Edit task'}</h2>
            <p>{isNew ? 'Adds a row to the owner’s tab and its pillar' : `${t.owner}’s tab · ${t.pillar || 'No pillar'}`}</p>
          </div>
          <button type="button" className="round-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={16} stroke={2} />
          </button>
        </header>

        {hint && (
          <p className="sheet-hint">
            <Icon name="clock" size={16} /> {hint}
          </p>
        )}

        <textarea
          className={`ts-title${err ? ' bad' : ''}`}
          autoFocus={isNew}
          rows={2}
          value={t.title}
          placeholder="What needs doing?"
          onChange={(e) => {
            put({ title: e.target.value })
            setErr('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) save(e)
          }}
        />
        {err && <small className="ts-err">{err}</small>}

        <div className="ts-status">
          <Segmented value={t.status} options={STATUSES.map((s) => s.id)} onChange={setStatus} />
        </div>

        <div className="ts-grid">
          <Field label="Owner">
            <Select
              value={t.owner}
              options={TEAM.map((p) => p.name)}
              onChange={(owner) => put({ owner })}
              align="left"
              render={(n) => (
                <span className="sel-person">
                  <Avatar person={n} size={20} /> {n}
                </span>
              )}
            />
          </Field>
          <Field label="Priority">
            <Segmented value={t.priority || 'P2'} options={PRIORITIES.map((p) => p.id)} onChange={(priority) => put({ priority })} />
          </Field>
          <Field label="Related pillar / project">
            <Select value={t.pillar || NONE} options={[NONE, ...ALL_PILLARS]} onChange={(p) => put({ pillar: p === NONE ? null : p, workstream: null })} align="left" />
          </Field>
          <Field label="Workstream">
            <Select value={t.workstream || NONE} options={wsOptions} onChange={(w) => put({ workstream: w === NONE ? null : w })} align="left" />
          </Field>
          <Field label="Due date">
            <input type="date" className="date-in" value={t.due || ''} onChange={(e) => put({ due: e.target.value || null })} />
          </Field>
          <Field label="Completed date">
            <input
              type="date"
              className="date-in"
              value={t.completed || ''}
              disabled={t.status !== 'Done'}
              title={t.status !== 'Done' ? 'Set when the task is Done' : undefined}
              onChange={(e) => put({ completed: e.target.value || null })}
            />
          </Field>
          <Field label="Story points">
            <Segmented value={t.points == null ? NONE : String(t.points)} options={POINTS} onChange={(v) => put({ points: v === NONE ? null : Number(v) })} />
          </Field>
          <Field label="Hours">
            <Hours label="hours" value={t.hours} onChange={(hours) => put({ hours })} />
          </Field>
          <Field label="Notes" wide>
            <textarea rows={2} value={t.notes || ''} placeholder="Context, links, who you’re waiting on…" onChange={(e) => put({ notes: e.target.value })} />
          </Field>
        </div>

        <footer>
          {!isNew && (
            <button type="button" className="cta ghost danger" onClick={del}>
              <Icon name="trash" size={16} /> Delete
            </button>
          )}
          <span className="ts-rule">Story points are effort, not time. Hours count once the task is Done with a Completed Date.</span>
          <button type="button" className="cta ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="cta">
            {isNew ? 'Add task' : 'Save'}
          </button>
        </footer>
      </form>
    </div>
  )
}
