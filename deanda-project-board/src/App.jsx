import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppContext } from './lib/store'
import { USER, applyDirectory } from './data/board'
import { codeFor, loadDirectory, same, saveDirectory } from './lib/directory'
import * as api from './lib/api'
import { fmtMonth, todayISO } from './lib/format'
import { boardTasks, closeMonth, endedTasks, onBoard, shiftMonth } from './lib/selectors'
import { DEFAULTS } from './lib/settings'
import Environment from './components/Environment'
import Sidebar from './components/Sidebar'
import { PAGES } from './data/pages'
import Grabber from './components/Grabber'
import Palette from './components/Palette'
import TaskSheet from './components/TaskSheet'
import Toasts from './components/Toasts'
import PhoneTabs from './components/PhoneTabs'
import HoursWidget from './widgets/HoursWidget'
import QueueWidget from './widgets/QueueWidget'
import HoursByDayWidget from './widgets/HoursByDayWidget'
import Overview from './pages/Overview'
import MyWork from './pages/MyWork'
import Board from './pages/Board'
import Tasks from './pages/Tasks'
import Pillars from './pages/Pillars'
import Team from './pages/Team'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import ManageSheet from './components/ManageSheet'
import Guide from './pages/Guide'

const VIEWS = {
  overview: Overview,
  mine: MyWork,
  board: Board,
  tasks: Tasks,
  pillars: Pillars,
  team: Team,
  insights: Insights,
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

/** Snapshots for every month from `open` up to (not including) `now` that isn't archived yet. */
function closeEnded(archive, tasks, open, now) {
  const out = []
  if (!open || open >= now) return out
  for (let ym = open; ym < now; ym = shiftMonth(ym, 1)) if (!archive[ym]) out.push(closeMonth(tasks, ym))
  return out
}

/* Start-up: close any month that ended since the board was last open (e.g. the app
   wasn't opened on the 1st), before the first render, so every view starts on the
   current month's board. */
const BOOT = (() => {
  const archive = api.initialArchive()
  const now = todayISO().slice(0, 7)
  const snaps = closeEnded(archive, api.initialTasks(), api.lastOpenMonth(), now)
  snaps.forEach((snap) => {
    archive[snap.month] = snap
    api.archiveMonth(snap)
  })
  if (snaps.length) api.deleteTasks(endedTasks(api.initialTasks(), now).map((t) => t.id))
  api.markOpenMonth(now)
  return { archive, closed: snaps.map((x) => x.month), month: now }
})()

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
  /* completed tasks from months that have ended were cleared when those months closed */
  const [tasks, setTasks] = useState(() => api.initialTasks().filter((t) => onBoard(t, BOOT.month)))
  const [archive, setArchive] = useState(BOOT.archive)

  const toast = useCallback((t) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((all) => [...all.slice(-2), { id, ...t }])
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 3200)
  }, [])
  const announceClosed = useCallback((ym) => toast({ icon: 'calendar', title: `${fmtMonth(ym)} closed`, text: 'Archived for Insights · a new month’s board has started' }), [toast])

  /* months that ended while nobody had the app open were closed at start-up; say so once */
  useEffect(() => {
    BOOT.closed.splice(0).forEach(announceClosed)
  }, [announceClosed])

  /* "today" moves on at midnight even with the page left open (or a laptop asleep):
     check once a minute and when the window comes back; a new day re-draws every view,
     and a new month closes the one that just ended */
  const [today, setToday] = useState(todayISO)
  const latest = useRef({ today, tasks, archive })
  useEffect(() => {
    latest.current = { ...latest.current, tasks, archive }
  }, [tasks, archive])
  useEffect(() => {
    const check = () => {
      const t = todayISO()
      const was = latest.current.today
      if (t === was) return
      latest.current.today = t
      setToday(t)
      if (t.slice(0, 7) === was.slice(0, 7)) return
      const snaps = closeEnded(latest.current.archive, latest.current.tasks, was.slice(0, 7), t.slice(0, 7))
      snaps.forEach((snap) => {
        api.archiveMonth(snap)
        announceClosed(snap.month)
      })
      if (snaps.length) setArchive((a) => ({ ...a, ...Object.fromEntries(snaps.map((x) => [x.month, x])) }))
      /* the new month starts clean: last month's completed tasks are deleted, open ones carry over */
      const ended = endedTasks(latest.current.tasks, t.slice(0, 7))
      if (ended.length) {
        const gone = new Set(ended.map((x) => x.id))
        setTasks((all) => all.filter((x) => !gone.has(x.id)))
        api.deleteTasks([...gone])
      }
      api.markOpenMonth(t.slice(0, 7))
    }
    const id = setInterval(check, 60000)
    addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [announceClosed])

  /* the board is always this calendar month's; past months are in Insights */
  const month = today.slice(0, 7)
  const board = useMemo(() => boardTasks(tasks, month), [tasks, month])

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
        const patch = { status: 'Done', completed: t.completed || todayISO() }
        patchTask(t.id, patch)
        /* hours only count once they're logged, so ask for them */
        if (t.hours == null) setSheet({ task: { ...t, ...patch }, hint: 'Log the hours it took — they count toward Hours Logged once saved.' })
        else toast({ icon: 'check', title: 'Done', text: t.title })
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
    root.style.setProperty('--bg-blur', `${settings.bgBlur}px`)
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
      tasks: board, // this month's board: what every page except Insights shows
      allTasks: tasks,
      archive,
      addTask,
      patchTask,
      removeTask,
      toggleDone,
      openTask,
      month,
      today,
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
    [page, go, settings, set, toast, spatial, side, right, tasks, addTask, patchTask, removeTask, toggleDone, openTask, month, today, board, archive, me, preset, dir, addPerson, removePerson, addPillar, removePillar, addWorkstream, removeWorkstream],
  )

  const View = VIEWS[page]
  const label = PAGES.find((p) => p.id === page)?.label

  return (
    <AppContext.Provider value={ctx}>
      <main ref={stage} className={`stage${sheet ? ' sheet-open' : ''}`} data-layout={spatial ? 'spatial' : 'flat'}>
        <Environment />
        <div className={`space${side ? '' : ' no-side'}${right ? '' : ' no-right'}${booting ? ' booting' : ''}`} data-page={page}>
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
            <HoursByDayWidget />
          </aside>

          <Grabber />
        </div>

        {sheet === 'palette' && <Palette onClose={() => setSheet(null)} />}
        {sheet?.manage && <ManageSheet what={sheet.manage} pillar={sheet.pillar} onClose={() => setSheet(null)} />}
        {sheet?.task && <TaskSheet key={sheet.task.id || 'new'} task={sheet.task} hint={sheet.hint} onClose={() => setSheet(null)} />}
        <PhoneTabs />
        <Toasts items={toasts} />
      </main>
    </AppContext.Provider>
  )
}
