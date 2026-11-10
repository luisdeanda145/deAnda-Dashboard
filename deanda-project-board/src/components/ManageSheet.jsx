import { useState } from 'react'
import Icon from './Icon'
import { Avatar, Select } from './ui'
import { PILLARS, TONES } from '../data/board'
import { codeFor } from '../lib/directory'
import { useApp } from '../lib/store'

const COPY = {
  person: { title: 'Add team member', sub: 'They get their own tab, a row in By Person and can own tasks', icon: 'user', cta: 'Add member', done: 'Member added' },
  pillar: { title: 'Add pillar', sub: 'A new pillar tab, with its own workstreams', icon: 'layers', cta: 'Add pillar', done: 'Pillar added' },
  workstream: { title: 'Add workstream', sub: 'Files under a pillar and shows in its By Workstream', icon: 'pipeline', cta: 'Add workstream', done: 'Workstream added' },
}

function Field({ label, children, wide }) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

/** One small form for adding a teammate, a pillar or a workstream. */
export default function ManageSheet({ what, pillar, onClose }) {
  const { addPerson, addPillar, addWorkstream, toast } = useApp()
  const [f, setF] = useState({ name: '', role: '', tone: 'blue', blurb: '', pillar: pillar || PILLARS[0]?.name })
  const [err, setErr] = useState('')
  const put = (patch) => {
    setF((x) => ({ ...x, ...patch }))
    setErr('')
  }
  const c = COPY[what]

  const save = (e) => {
    e.preventDefault()
    const name = f.name.trim()
    const problem = what === 'person' ? addPerson(f) : what === 'pillar' ? addPillar(f) : addWorkstream(f)
    if (problem) {
      setErr(problem)
      return
    }
    toast({ icon: 'plus', title: c.done, text: what === 'workstream' ? `${name} · ${f.pillar}` : name })
    onClose()
  }

  return (
    <div className="sheet-wrap" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet task-sheet manage-sheet" role="dialog" aria-label={c.title} onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && !e.currentTarget.querySelector('.select.open') && onClose()}>
        <header>
          <span className="tu-ic">
            <Icon name={c.icon} size={21} />
          </span>
          <div>
            <h2>{c.title}</h2>
            <p>{c.sub}</p>
          </div>
          <button type="button" className="round-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={16} stroke={2} />
          </button>
        </header>

        <div className="ts-grid">
          <Field label="Name" wide={what !== 'person'}>
            <span className="name-in">
              {what === 'person' && <Avatar person={f.name.trim() || '?'} size={26} />}
              {what === 'pillar' && <span className={`pl-logo tone-${f.tone}`}>{codeFor(f.name) || '··'}</span>}
              <input
                type="text"
                className={`text-in${err ? ' bad' : ''}`}
                autoFocus
                value={f.name}
                placeholder={what === 'person' ? 'First name' : what === 'pillar' ? 'e.g. Real Estate' : 'e.g. Partnerships'}
                onChange={(e) => put({ name: e.target.value })}
              />
            </span>
          </Field>

          {what === 'person' && (
            <Field label="Role (optional)">
              <input type="text" className="text-in" value={f.role} placeholder="Worked out from their pillars if blank" onChange={(e) => put({ role: e.target.value })} />
            </Field>
          )}

          {what === 'pillar' && (
            <>
              <Field label="Colour" wide>
                <span className="tone-pick" role="radiogroup" aria-label="Colour">
                  {TONES.map((t) => (
                    <button type="button" key={t} role="radio" aria-checked={f.tone === t} aria-label={t} className={`dot ${t}${f.tone === t ? ' on' : ''}`} onClick={() => put({ tone: t })} />
                  ))}
                </span>
              </Field>
              <Field label="What it covers (optional)" wide>
                <textarea rows={2} value={f.blurb} placeholder="Clients, products or programs under this pillar" onChange={(e) => put({ blurb: e.target.value })} />
              </Field>
            </>
          )}

          {what === 'workstream' && (
            <Field label="Pillar" wide>
              <Select value={f.pillar} options={PILLARS.map((p) => p.name)} onChange={(p) => put({ pillar: p })} align="left" />
            </Field>
          )}
        </div>
        {err && <small className="ts-err">{err}</small>}

        <footer>
          <span className="ts-rule">Saved in this browser until the backend is connected.</span>
          <button type="button" className="cta ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="cta">
            {c.cta}
          </button>
        </footer>
      </form>
    </div>
  )
}
