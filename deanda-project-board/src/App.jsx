import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppContext } from './lib/store'
import { BOARD_MONTH, USER, applyDirectory } from './data/board'
import { codeFor, loadDirectory, same, saveDirectory } from './lib/directory'
import * as api from './lib/api'
import { todayISO } from './lib/format'
import { DEFAULTS } from './lib/settings'
import Environment from './components/Environment'
import Sidebar from './components/Sidebar'
import { PAGES } from './data/pages'
import Grabber from './components/Grabber'
import Palette from './components/Palette'
import TaskSheet from './components/TaskSheet'
import Toasts from './components/Toasts'
import HoursWidget from './widgets/HoursWidget'
import QueueWidget from './widgets/QueueWidget'
import VelocityWidget from './widgets/VelocityWidget'
import Overview from './pages/Overview'
import MyWork from './pages/MyWork'
import Board from './pages/Board'
import Tasks from './pages/Tasks'
import Pillars from './pages/Pillars'
import Team from './pages/Team'
import Hours from './pages/Hours'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import Compare from './pages/Compare'
import ManageSheet from './components/ManageSheet'
import Guide from './pages/Guide'

const VIEWS = {
  overview: Overview,
  mine: MyWork,
  board: Board,
  tasks: Tasks,
  pillars: Pillars,
  team: Team,
  hours: Hours,
  insights: Insights,
  compare: Compare,
  settings: Settings,
  guide: Guide,
}

/* the scene is drawn on a fixed 1780×910 canvas and zoomed to fit the window */
const CANVAS = { w: 1780, h: 910 }
const SPATIAL_MIN = 1100

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('dac-board-space-v2') || '{}') }
  } catch {
    return DEFAULTS
  }
}

const pageFromHash = () => {
  const id = location.hash.replace(/^#\/?/, '')
  return VIEWS[id] ? id : 'overview'
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings)
  const [page, setPage] = useState(pageFromHash)
  const [side, setSide] = useState(true)
  const [right, setRight] = useState(true)
  const [sheet, setSheet] = useState(null) // 'palette' | { task } | null
  const [toasts, setToasts] = useState([])
  const [booting, setBooting] = useState(true)
  const [spatial, setSpatial] = useState(() => innerWidth >= SPATIAL_MIN)
  const stage = useRef(null)

  /* ---------------- board state ---------------- */
  const [tasks, setTasks] = useState(api.initialTasks)
  const [month, setMonth] = useState(BOARD_MONTH)
  const [me, setMe] = useState(USER.name) // whose tab My Work shows
  const [preset, setPreset] = useState(null) // a filter handed to All Tasks

  /* ---------------- team, pillars, workstreams ---------------- */
  const [dir, setDir] = useState(loadDirectory)
  applyDirectory(dir) // before any child renders, so they all read the edited lists
  useEffect(() => saveDirectory(dir), [dir])

  /* each returns an error message, or null when the change was made */
  const addPerson = useCallback(
    ({ name, role }) => {
      name = name.trim()
      if (!name) return 'Give them a name'
      const dup = dir.team.find((p) => same(p.name, name))
      if (dup) return `${dup.name} is already on the team`
      setDir((d) => ({ ...d, team: [...d.team, { name, ...(role?.trim() ? { role: role.trim() } : {}) }] }))
      return null
    },
    [dir],
  )
  const removePerson = useCallback(
    (name) => {
      const n = tasks.filter((t) => t.owner === name).length
      if (n) return `${name} still owns ${n} task${n === 1 ? '' : 's'}. Reassign them first.`
      if (name === USER.name) return 'You can’t remove yourself'
      setDir((d) => ({ ...d, team: d.team.filter((p) => p.name !== name) }))
      return null
    },
    [tasks],
  )
  const addPillar = useCallback(
    ({ name, tone, blurb }) => {
      name = name.trim()
      if (!name) return 'Give the pillar a name'
      const dup = dir.pillars.find((p) => same(p.name, name))
      if (dup) return `There is already a ${dup.name} pillar`
      setDir((d) => ({ ...d, pillars: [...d.pillars, { name, code: codeFor(name), tone: tone || 'blue', blurb: blurb?.trim() || '' }] }))
      return null
    },
    [dir],
  )
  const removePillar = useCallback(
    (name) => {
      const n = tasks.filter((t) => t.pillar === name).length
      if (n) return `${n} task${n === 1 ? ' is' : 's are'} filed under ${name}. Move them first.`
      if (dir.pillars.length === 1) return 'The board needs at least one pillar'
      setDir((d) => ({ ...d, pillars: d.pillars.filter((p) => p.name !== name), workstreams: d.workstreams.filter((w) => w.pillar !== name) }))
      return null
    },
    [tasks, dir],
  )
  const addWorkstream = useCallback(
    ({ name, pillar }) => {
      name = name.trim()
      if (!name) return 'Give the workstream a name'
      if (!pillar) return 'Pick the pillar it files under'
      if (dir.workstreams.some((w) => w.pillar === pillar && same(w.name, name))) return `${pillar} already has ${name}`
      setDir((d) => ({ ...d, workstreams: [...d.workstreams, { name, pillar }] }))
      return null
    },
    [dir],
  )
  const removeWorkstream = useCallback(
    ({ name, pillar }) => {
      const n = tasks.filter((t) => t.pillar === pillar && t.workstream === name).length
      if (n) return `${n} task${n === 1 ? ' uses' : 's use'} ${name}. Move them first.`
      setDir((d) => ({ ...d, workstreams: d.workstreams.filter((w) => !(w.name === name && w.pillar === pillar)) }))
      return null
    },
    [tasks],
  )

  const set = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), [])

  const toast = useCallback((t) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((all) => [...all.slice(-2), { id, ...t }])
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 3200)
  }, [])

  /* optimistic writes: the UI updates at once, the api call follows */
  const addTask = useCallback(async (task) => {
    const tmp = { ...task, id: `tmp-${Date.now()}`, fresh: true }
    setTasks((all) => [tmp, ...all])
    const saved = await api.createTask({ ...task })
    setTasks((all) => all.map((t) => (t.id === tmp.id ? { ...saved, fresh: true } : t)))
    return saved
  }, [])
  const patchTask = useCallback((id, patch) => {
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, ...patch, moved: true } : t)))
    api.updateTask(id, patch)
  }, [])
  const removeTask = useCallback((id) => {
    setTasks((all) => all.filter((t) => t.id !== id))
    api.deleteTask(id)
  }, [])

  /** Tick a task done (stamps today as Completed Date) or reopen it. */
  const toggleDone = useCallback(
    (t) => {
      if (t.status === 'Done') {
        patchTask(t.id, { status: 'In progress', completed: null })
        toast({ icon: 'sync', title: 'Reopened', text: t.title })
      } else {
        patchTask(t.id, { status: 'Done', completed: t.completed || todayISO(), real: t.real ?? t.est ?? null })
        toast({ icon: 'check', title: 'Done', text: t.real == null ? 'Real hours set to the estimate — adjust if needed' : t.title })
      }
    },
    [patchTask, toast],
  )

  const openTask = useCallback((task) => setSheet({ task: task || {} }), [])

  useEffect(() => {
    localStorage.setItem('dac-board-space-v2', JSON.stringify(settings))
    const root = document.documentElement
    root.dataset.motion = settings.motion ? 'on' : 'off'
    root.style.setProperty('--curve', `${settings.curve}deg`)
    root.style.setProperty('--depth', `${settings.depth}px`)
    root.style.setProperty('--frost', `${settings.frost}px`)
    root.style.setProperty('--tint', settings.tint / 100)
  }, [settings])

  const toTop = () => {
    stage.current?.querySelector('.page-scroll')?.scrollTo(0, 0)
    if (innerWidth < SPATIAL_MIN) scrollTo(0, 0)
  }

  const go = useCallback((id) => {
    if (id === pageFromHash()) return
    history.pushState(null, '', id === 'overview' ? location.pathname : `#/${id}`)
    toTop()
    setPage(id)
  }, [])
  useEffect(() => {
    const pop = () => {
      toTop()
      setPage(pageFromHash())
    }
    addEventListener('popstate', pop)
    return () => removeEventListener('popstate', pop)
  }, [])

  useEffect(() => {
    const fit = () => {
      const wide = innerWidth >= SPATIAL_MIN
      setSpatial(wide)
      const z = wide ? Math.min(1.45, Math.max(0.55, Math.min(innerWidth / CANVAS.w, innerHeight / CANVAS.h))) : 1
      document.documentElement.style.setProperty('--z', z.toFixed(4))
    }
    fit()
    addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [])

  /* gaze highlight */
  useEffect(() => {
    let last = null
    const move = (e) => {
      const el = e.target.closest?.('.hl')
      if (last && last !== el) last.classList.remove('lit')
      last = el
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
      el.classList.add('lit')
    }
    addEventListener('pointermove', move)
    return () => removeEventListener('pointermove', move)
  }, [])

  /* ⌘K search, N new task */
  useEffect(() => {
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSheet((s) => (s === 'palette' ? null : 'palette'))
      } else if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) {
        setSheet((s) => s || { task: {} })
      }
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 2000)
    return () => clearTimeout(t)
  }, [])

  const ctx = useMemo(
    () => ({
      page,
      go,
      settings,
      set,
      toast,
      openSheet: setSheet,
      spatial,
      side,
      setSide,
      right,
      setRight,
      tasks,
      addTask,
      patchTask,
      removeTask,
      toggleDone,
      openTask,
      month,
      setMonth,
      me,
      setMe,
      preset,
      setPreset,
      dir,
      addPerson,
      removePerson,
      addPillar,
      removePillar,
      addWorkstream,
      removeWorkstream,
      manage: (what, extra) => setSheet({ manage: what, ...extra }),
    }),
    [page, go, settings, set, toast, spatial, side, right, tasks, addTask, patchTask, removeTask, toggleDone, openTask, month, me, preset, dir, addPerson, removePerson, addPillar, removePillar, addWorkstream, removeWorkstream],
  )

  const View = VIEWS[page]
  const label = PAGES.find((p) => p.id === page)?.label

  return (
    <AppContext.Provider value={ctx}>
      <main ref={stage} className={`stage${sheet ? ' sheet-open' : ''}`} data-layout={spatial ? 'spatial' : 'flat'}>
        <Environment />
        <div className={`space${side ? '' : ' no-side'}${right ? '' : ' no-right'}${booting ? ' booting' : ''}`}>
          <Sidebar />

          <section className="win main" aria-label={label}>
            <div className="page-scroll">
              <div className="page" key={page} data-page={page}>
                <View />
              </div>
            </div>
          </section>

          <aside className="facet right" aria-label="Widgets">
            <HoursWidget />
            <QueueWidget />
            <VelocityWidget />
          </aside>

          <Grabber />
        </div>

        {sheet === 'palette' && <Palette onClose={() => setSheet(null)} />}
        {sheet?.manage && <ManageSheet what={sheet.manage} pillar={sheet.pillar} onClose={() => setSheet(null)} />}
        {sheet?.task && <TaskSheet key={sheet.task.id || 'new'} task={sheet.task} hint={sheet.hint} onClose={() => setSheet(null)} />}
        <Toasts items={toasts} />
      </main>
    </AppContext.Provider>
  )
}
