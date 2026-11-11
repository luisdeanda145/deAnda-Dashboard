/* ============================================================
   Backend seam. Every read and write the UI makes goes through
   these functions, so connecting a real backend means replacing
   the bodies below and nothing else.

   Today they resolve against the tasks imported from
   Project_Board_Nov_2026.xlsx (src/data/tasks.json) and keep
   changes in memory only.

   A task row (one line of a personal tab / the ToDo Feed):
   {
     id:         string
     owner:      string          // TEAM name
     title:      string          // "Task"
     pillar:     string | null   // "Related pillar / project"
     workstream: string | null
     priority:   'P0'|'P1'|'P2'|'P3'|null
     status:     'Not started'|'In progress'|'Blocked'|'Done'
     due:        'YYYY-MM-DD' | null
     completed:  'YYYY-MM-DD' | null
     points:     number | null   // Story points: effort, not time (1, 2, 3, 5, 8, 13)
     hours:      number | null   // Hours worked on it
     notes:      string | null
   }
   ============================================================ */
import SEED from '../data/tasks.json'

const API_URL = import.meta.env.VITE_API_URL || '' // e.g. https://api.deanda.capital/board
const latency = (v) => new Promise((r) => setTimeout(() => r(v), 120))

/** GET /tasks?month=YYYY-MM */
export async function fetchTasks(/* month */) {
  if (API_URL) {
    // const res = await fetch(`${API_URL}/tasks?month=${month}`)
    // return res.json()
  }
  return latency(SEED.map((t) => ({ ...t })))
}

/** POST /tasks */
export async function createTask(task) {
  if (API_URL) {
    // const res = await fetch(`${API_URL}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) })
    // return res.json()
  }
  return latency({ ...task, id: task.id || `t${Date.now().toString(36)}` })
}

/** PATCH /tasks/:id */
export async function updateTask(id, patch) {
  if (API_URL) {
    // const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    // return res.json()
  }
  return latency({ id, ...patch })
}

/** DELETE /tasks/:id */
export async function deleteTask(id) {
  if (API_URL) {
    // await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' })
  }
  return latency({ id })
}

/* ---------------- month archive ----------------
   When a month ends, its board (completed work plus what was still
   open) and its totals are sent here; Insights reads them back.
   Until the backend exists they are kept in this browser. */
const ARCHIVE_KEY = 'dac-board-archive'
const readArchive = () => {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '{}')
  } catch {
    return {}
  }
}

/** POST /months/:ym/close  — body: { month, closedAt, tasks, summary, stats } */
export async function archiveMonth(snapshot) {
  if (API_URL) {
    // await fetch(`${API_URL}/months/${snapshot.month}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) })
  }
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify({ ...readArchive(), [snapshot.month]: snapshot }))
  } catch {
    /* storage full or unavailable: the backend will hold it once connected */
  }
  return latency(snapshot)
}

/** GET /months  → { 'YYYY-MM': snapshot } for every closed month */
export async function fetchArchive() {
  if (API_URL) {
    // const res = await fetch(`${API_URL}/months`)
    // return res.json()
  }
  return latency(readArchive())
}
export const initialArchive = readArchive

/* Which month the board was last open on, so a month that ended while
   nobody had the app open still gets closed on the next visit. */
const OPEN_KEY = 'dac-board-open-month'
export const lastOpenMonth = () => {
  try {
    return localStorage.getItem(OPEN_KEY)
  } catch {
    return null
  }
}
export const markOpenMonth = (ym) => {
  try {
    localStorage.setItem(OPEN_KEY, ym)
  } catch {
    /* ignore */
  }
}

/** The initial rows, available synchronously so the first paint has data. */
export const initialTasks = () => SEED.map((t) => ({ ...t }))
