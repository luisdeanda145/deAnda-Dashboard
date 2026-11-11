import { Fragment, useRef, useState } from 'react'
import Icon from './Icon'
import { useDismiss } from '../lib/hooks'
import { dueLabel, fmtDay, hrs, initials, pct } from '../lib/format'
import { useCountUp } from '../lib/hooks'
import { PRIORITIES, statusTone } from '../data/board'

/** Small glass pill with a trend arrow — "↗ 0.3%" in the reference. */
export function Trend({ value, suffix = '%', digits = 1, plain }) {
  const down = value < 0
  return (
    <span className={`trend${down ? ' down' : ''}${plain ? ' plain' : ''}`}>
      <Icon name={down ? 'down' : 'up'} size={13} stroke={2} />
      {suffix === '%' ? pct(value, digits) : `${Math.abs(value)}${suffix}`}
    </span>
  )
}

/** Pill button that opens a glass menu of options. */
export function Select({ value, options, onChange, align = 'right', small, prefix, render }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useDismiss(ref, open, () => setOpen(false))
  return (
    <div className={`select${open ? ' open' : ''}${small ? ' small' : ''}`} ref={ref}>
      <button type="button" className="select-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {prefix && <span className="sel-prefix">{prefix}</span>}
        {render ? render(value) : value}
        <Icon name="chevDown" size={15} stroke={2} />
      </button>
      <div className={`menu to-${align}`} role="listbox">
        {options.map((o, i) => (
          <button
            type="button"
            key={o}
            role="option"
            aria-selected={o === value}
            className={o === value ? 'on' : ''}
            style={{ '--i': i }}
            onClick={() => {
              onChange(o)
              setOpen(false)
            }}
          >
            {render ? render(o) : o}
            {o === value && <Icon name="check" size={15} stroke={2.2} />}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Round photo or gradient monogram, with an optional presence dot. */
export function Avatar({ person, size = 36, status }) {
  const name = typeof person === 'string' ? person : person.name
  const hue = (name.charCodeAt(0) * 37 + name.length * 11) % 360
  return (
    <span className="avatar" style={{ width: size, height: size, '--h': hue, fontSize: size * 0.36 }}>
      {person.photo ? <img src={person.photo} alt="" /> : initials(name)}
      {status && <i className={`presence ${status}`} />}
    </span>
  )
}

export function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch${on ? ' on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <i />
    </button>
  )
}

/** Segmented control with a sliding glass thumb. */
export function Segmented({ value, options, onChange }) {
  const i = Math.max(0, options.indexOf(value))
  return (
    <div className="seg" style={{ '--n': options.length, '--i': i }}>
      <i className="seg-thumb" />
      {options.map((o) => (
        <button type="button" key={o} className={o === value ? 'on' : ''} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

/** Card title row: title on the left, whatever controls on the right. */
export function CardHead({ title, icon, children }) {
  return (
    <header className="card-head">
      <h3>
        {icon && <Icon name={icon} size={19} />}
        {title}
      </h3>
      {children}
    </header>
  )
}

/** The six-dot drag handle in the corner of each reference card. */
export function Grip() {
  return (
    <span className="grip" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  )
}

/** A heading whose words arrive one after another. */
export function Words({ text }) {
  const words = text.split(' ')
  return words.map((w, i) => (
    <Fragment key={i}>
      <span className="word" style={{ '--i': i }} aria-hidden="true">
        {w}
      </span>
      {i < words.length - 1 && ' '}
    </Fragment>
  ))
}

export function PageHead({ title, sub, children }) {
  const n = title.split(' ').length
  return (
    <div className="page-head">
      <div>
        <h1 aria-label={title}>
          <Words text={title} />
        </h1>
        {sub && (
          <p className="rv" style={{ '--i': n }}>
            {sub}
          </p>
        )}
      </div>
      {children && (
        <div className="page-tools rv" style={{ '--i': n + 1 }}>
          {children}
        </div>
      )}
    </div>
  )
}

/** A task's dates: when it's due and, once Done, when it was completed. */
export function TaskDates({ t, stack }) {
  const done = t.status === 'Done'
  const late = !done && dueLabel(t.due).includes('late')
  return (
    <span className={`t-dates${stack ? ' t-stacked' : ''}`}>
      <span className={late ? 'late' : ''} title="Due date">
        <Icon name="calendar" size={12} /> {done ? (t.due ? fmtDay(t.due) : 'No date') : dueLabel(t.due)}
      </span>
      {done && (
        <span className="t-done" title="Completed date">
          <Icon name="check" size={12} stroke={2.4} /> {t.completed ? fmtDay(t.completed) : 'No date'}
        </span>
      )}
    </span>
  )
}

/** Status pill in the colour of its lane. */
export function StatusPill({ status }) {
  return <span className={`status tone-${statusTone(status)}`}>{status}</span>
}

/** P0–P3 pill. */
export function Prio({ p }) {
  const tone = PRIORITIES.find((x) => x.id === p)?.tone || 'mute'
  return <span className={`prio tone-${tone}`}>{p || '—'}</span>
}

/** Overlapping avatar row. */
export function Faces({ names, size = 26, max = 4 }) {
  const shown = names.slice(0, max)
  return (
    <span className="faces">
      {shown.map((n) => (
        <Avatar key={n} person={n} size={size} />
      ))}
      {names.length > max && <i style={{ width: size, height: size }}>+{names.length - max}</i>}
    </span>
  )
}

/** Stat tile: icon, label, a counted-up figure and an optional note. */
export function Stat({ icon, label, value, fmt = (v) => hrs(v), note, d = 1, tone }) {
  const v = useCountUp(value, 1100, d * 70)
  return (
    <article className={`card stat hl rise${tone ? ` tone-${tone}` : ''}`} style={{ '--d': d }}>
      <span className="stat-ic">
        <Icon name={icon} size={18} />
      </span>
      <small>{label}</small>
      <strong className="figure">{fmt(v)}</strong>
      {note && <span className="stat-note">{note}</span>}
    </article>
  )
}
