/* ============================================================
   Backend seam. Every read and write the UI makes goes through
   these functions.

   With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, they talk
   to Supabase (tables and rules in supabase/schema.sql). Without
   them, the app runs on the tasks imported from
   Project_Board_Nov_2026.xlsx (src/data/tasks.json), keeping
   changes in memory and the month archive in this browser.

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
import { supabase } from './supabase'

/** True when the app reads and writes the shared database. */
export const connected = !!supabase

const latency = (v) => new Promise((r) => setTimeout(() => r(v), 120))
const must = ({ data, error }) => {
  if (error) throw error
  return data
}

const COLS = 'id, owner, title, pillar, workstream, priority, status, due, completed, points, hours, notes'
const FIELDS = ['owner', 'title', 'pillar', 'workstream', 'priority', 'status', 'due', 'completed', 'points', 'hours', 'notes']
/** only real columns go to the database (the UI adds flags like `fresh`) */
const pick = (o) => Object.fromEntries(FIELDS.filter((k) => k in o).map((k) => [k, o[k] === '' ? null : o[k]]))
const row = (r) => ({ ...r, points: r.points == null ? null : Number(r.points), hours: r.hours == null ? null : Number(r.hours) })

/* ---------------- tasks ---------------- */

/** Every task on the board (the database only holds the current month's board). */
export async function fetchTasks() {
  if (!connected) return latency(SEED.map((t) => ({ ...t })))
  const out = []
  for (let from = 0; ; from += 1000) {
    const page = must(await supabase.from('tasks').select(COLS).order('created_at').order('id').range(from, from + 999))
    out.push(...page.map(row))
    if (page.length < 1000) return out
  }
}

export async function createTask(task) {
  if (!connected) return latency({ ...task, id: task.id || `t${Date.now().toString(36)}` })
  return row(must(await supabase.from('tasks').insert(pick(task)).select(COLS).single()))
}

export async function updateTask(id, patch) {
  if (!connected) return latency({ id, ...patch })
  must(await supabase.from('tasks').update(pick(patch)).eq('id', id))
  return { id, ...patch }
}

export async function deleteTask(id) {
  if (!connected) return latency({ id })
  must(await supabase.from('tasks').delete().eq('id', id))
  return { id }
}

/** The completed tasks a new month clears. With the database, its monthly job does this. */
export async function deleteTasks(ids) {
  return latency({ ids })
}

/** Calls `onChange` whenever anyone changes a task; returns a function that stops listening. */
export function watchTasks(onChange) {
  if (!connected) return () => {}
  const channel = supabase
    .channel('tasks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, onChange)
    .subscribe()
  return () => supabase.removeChannel(channel)
}

/** The first rows to paint: the bundled data in local mode, nothing until loaded with the database. */
export const initialTasks = () => (connected ? [] : SEED.map((t) => ({ ...t })))

/* ---------------- team, pillars, workstreams ---------------- */

/** { team, pillars, workstreams } from the database, or null in local mode. */
export async function fetchDirectory() {
  if (!connected) return null
  const [team, pillars, workstreams] = await Promise.all([
    supabase.from('team_members').select('name, role').order('sort').order('created_at'),
    supabase.from('pillars').select('name, code, tone, blurb').order('sort').order('name'),
    supabase.from('workstreams').select('name, pillar').order('sort').order('name'),
  ])
  return {
    team: must(team).map((p) => (p.role ? p : { name: p.name })),
    pillars: must(pillars),
    workstreams: must(workstreams),
  }
}
const nextSort = async (table) => {
  const top = must(await supabase.from(table).select('sort').order('sort', { ascending: false }).limit(1))
  return (top[0]?.sort ?? -1) + 1
}
export async function addPerson(p) {
  if (connected) must(await supabase.from('team_members').insert({ name: p.name, role: p.role || null, sort: await nextSort('team_members') }))
}
export async function removePerson(name) {
  if (connected) must(await supabase.from('team_members').delete().eq('name', name))
}
export async function addPillar(p) {
  if (connected) must(await supabase.from('pillars').insert({ name: p.name, code: p.code, tone: p.tone, blurb: p.blurb || '', sort: await nextSort('pillars') }))
}
export async function removePillar(name) {
  if (connected) must(await supabase.from('pillars').delete().eq('name', name)) // its workstreams go with it
}
export async function addWorkstream(w) {
  if (connected) must(await supabase.from('workstreams').insert({ name: w.name, pillar: w.pillar, sort: await nextSort('workstreams') }))
}
export async function removeWorkstream(w) {
  if (connected) must(await supabase.from('workstreams').delete().eq('name', w.name).eq('pillar', w.pillar))
}

/* ---------------- month archive ----------------
   When a month ends, only its totals are saved; the completed tasks
   themselves are deleted and open ones carry over. Insights reads
   these totals back.

   With the database, the `months` table holds them and its hourly job
   (close_ended_months in supabase/schema.sql) does the closing. In local
   mode the app closes months itself and keeps them in this browser.

   One row per closed month:
   {
     month:    'YYYY-MM'
     closedAt: ISO timestamp
     summary:  { tasks, open, closed, inProgress, notStarted, blocked,
                 pointsPlanned, pointsDone }        board at month end
     stats:    { ym, done, hours, ptsDone, hrsPerPt, due, duePts, onTime,
                 people, empty,
                 hoursByPerson: { name: hrs }, doneByPerson: { name: n },
                 hoursByPillar: { name: hrs }, doneByPillar: { name: n } }
   } */
const ARCHIVE_KEY = 'dac-board-archive'
const readArchive = () => {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '{}')
  } catch {
    return {}
  }
}

/** Local mode only: the database closes months itself. */
export async function archiveMonth(snapshot) {
  if (connected) return snapshot
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify({ ...readArchive(), [snapshot.month]: snapshot }))
  } catch {
    /* storage full or unavailable */
  }
  return latency(snapshot)
}

/** { 'YYYY-MM': { month, closedAt, summary, stats } } for every closed month */
export async function fetchArchive() {
  if (!connected) return latency(readArchive())
  const rows = must(await supabase.from('months').select('month, closed_at, summary, stats').order('month'))
  return Object.fromEntries(rows.map((m) => [m.month, { month: m.month, closedAt: m.closed_at, summary: m.summary, stats: m.stats }]))
}
export const initialArchive = () => (connected ? {} : readArchive())

/* Which month the board was last open on, so a month that ended while
   nobody had the app open still gets closed on the next visit (local mode). */
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

/* ---------------- messages ----------------
   Short notes between teammates (My Work). Each person keeps their
   latest 10, and messages are cleared when the month changes: with
   the database by supabase/messages.sql, in local mode here.
   A message: { id, to_name, from_name, body, created_at, read_at } */
const MSG_KEY = 'dac-board-messages'
const MSG_COLS = 'id, to_name, from_name, body, created_at, read_at'
const sameMonth = (iso, now = new Date()) => {
  const d = new Date(iso)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}
const readLocalMsgs = () => {
  try {
    return JSON.parse(localStorage.getItem(MSG_KEY) || '[]').filter((m) => sameMonth(m.created_at))
  } catch {
    return []
  }
}
const writeLocalMsgs = (all) => {
  try {
    localStorage.setItem(MSG_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}
/** keep each person's latest 10 */
const keepTen = (all) => {
  const n = {}
  return [...all].sort((a, b) => b.created_at.localeCompare(a.created_at)).filter((m) => (n[m.to_name] = (n[m.to_name] || 0) + 1) <= 10)
}

/** This month's messages, newest first. */
export async function fetchMessages() {
  if (!connected) return latency(keepTen(readLocalMsgs()))
  const rows = must(await supabase.from('messages').select(MSG_COLS).order('created_at', { ascending: false }).limit(500))
  return rows.filter((m) => sameMonth(m.created_at))
}

export async function sendMessage({ to, from, body }) {
  if (!connected) {
    const m = { id: `m${Date.now().toString(36)}`, to_name: to, from_name: from, body, created_at: new Date().toISOString(), read_at: null }
    writeLocalMsgs(keepTen([m, ...readLocalMsgs()]))
    return latency(m)
  }
  return must(await supabase.from('messages').insert({ to_name: to, from_name: from, body }).select(MSG_COLS).single())
}

export async function markMessagesRead(ids) {
  if (!ids.length) return
  const at = new Date().toISOString()
  if (!connected) return writeLocalMsgs(readLocalMsgs().map((m) => (ids.includes(m.id) ? { ...m, read_at: at } : m)))
  must(await supabase.from('messages').update({ read_at: at }).in('id', ids))
}

export function watchMessages(onChange) {
  if (!connected) return () => {}
  const channel = supabase
    .channel('messages')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onChange)
    .subscribe()
  return () => supabase.removeChannel(channel)
}

/* ---------------- sign-in ---------------- */

export const getSession = async () => (connected ? (await supabase.auth.getSession()).data.session : null)
export const onAuthChange = (cb) => {
  if (!connected) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}
export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: location.origin + location.pathname,
      queryParams: { hd: 'deanda.capital', prompt: 'select_account' },
    },
  })
export const signOut = () => supabase.auth.signOut()
