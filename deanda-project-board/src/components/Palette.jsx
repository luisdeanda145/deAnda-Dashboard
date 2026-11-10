import { useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { Avatar } from './ui'
import { PILLARS, TEAM } from '../data/board'
import { PAGES } from '../data/pages'
import { isOpen } from '../lib/selectors'
import { useApp } from '../lib/store'

/** ⌘K sheet: jump to a page, a person, a pillar or a task, or run an action. */
export default function Palette({ onClose }) {
  const { go, tasks, openTask, setMe, setSide, side, setRight, right } = useApp()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const list = useRef(null)

  const items = useMemo(() => {
    const all = [
      ...PAGES.map((p) => ({ group: 'Pages', key: `p-${p.id}`, icon: p.icon, label: p.label, hint: 'Go to', run: () => go(p.id) })),
      { group: 'Actions', key: 'a-new', icon: 'plus', label: 'New task', hint: 'N', run: () => openTask(), swap: true },
      { group: 'Actions', key: 'a-side', icon: 'sidebarL', label: side ? 'Hide sidebar' : 'Show sidebar', hint: 'View', run: () => setSide(!side) },
      { group: 'Actions', key: 'a-right', icon: 'sidebarR', label: right ? 'Hide widgets' : 'Show widgets', hint: 'View', run: () => setRight(!right) },
      ...TEAM.map((p) => ({
        group: 'People',
        key: `u-${p.name}`,
        person: p,
        label: `${p.name}’s tasks`,
        hint: `${tasks.filter((t) => t.owner === p.name && isOpen(t)).length} open`,
        run: () => {
          setMe(p.name)
          go('mine')
        },
      })),
      ...PILLARS.map((p) => ({ group: 'Pillars', key: `l-${p.name}`, icon: 'layers', label: p.name, hint: p.blurb, run: () => go('pillars') })),
      ...tasks.map((t) => ({ group: 'Tasks', key: `t-${t.id}`, icon: t.status === 'Done' ? 'check' : 'circle', label: t.title, hint: `${t.owner} · ${t.status}`, run: () => openTask(t), swap: true })),
    ]
    const s = q.trim().toLowerCase()
    if (!s) return all.filter((i) => i.group === 'Pages' || i.group === 'Actions')
    return all.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(s)).slice(0, 16)
  }, [q, go, tasks, openTask, setMe, setSide, side, setRight, right])

  /* "swap" items open another sheet in place of this one */
  const pick = (it) => {
    if (!it.swap) onClose()
    it.run()
  }

  const key = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const n = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      setSel(n)
      list.current?.querySelector(`[data-n="${n}"]`)?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' && items[sel]) pick(items[sel])
    else if (e.key === 'Escape') onClose()
  }

  let last = null
  return (
    <div className="sheet-wrap" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet palette" role="dialog" aria-label="Search">
        <label className="pal-input">
          <Icon name="search" size={20} />
          <input
            autoFocus
            value={q}
            placeholder="Search tasks, people, pillars…"
            onChange={(e) => {
              setQ(e.target.value)
              setSel(0)
            }}
            onKeyDown={key}
          />
          <kbd>esc</kbd>
        </label>
        <div className="pal-list" ref={list}>
          {items.length === 0 && <p className="pal-empty">No results for “{q}”</p>}
          {items.map((it, n) => {
            const head = it.group !== last
            last = it.group
            return (
              <div key={it.key}>
                {head && <h6>{it.group}</h6>}
                <button
                  type="button"
                  data-n={n}
                  className={`pal-row${n === sel ? ' on' : ''}`}
                  onPointerMove={() => n !== sel && setSel(n)}
                  onClick={() => pick(it)}
                >
                  {it.person ? (
                    <Avatar person={it.person} size={28} />
                  ) : (
                    <span className="pal-ic">
                      <Icon name={it.icon} size={17} />
                    </span>
                  )}
                  <span className="pal-label">{it.label}</span>
                  <span className="pal-hint">{it.hint}</span>
                  <Icon name="arrowRight" size={15} className="pal-go" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
