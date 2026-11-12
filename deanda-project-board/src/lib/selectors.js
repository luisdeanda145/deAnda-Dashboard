/* ============================================================
   Board maths — each function reproduces a block of formulas
   from the spreadsheet's Overview and personal tabs, so the
   dashboard reports the same numbers the sheet did.

   Rules (from the sheet):
   · Open = any task whose status is not Done (no status counts as open)
   · Story points measure effort, not time. Planned = all story points.
   · Hours logged = Hours of Done tasks, credited to the day in
     Completed Date.
   · Hours per point = hours ÷ story points on Done tasks that have both.
   ============================================================ */
import { PILLARS, TEAM, WORKSTREAMS } from '../data/board'
import { addDays, daysInMonth, diffDays, inMonth, todayISO } from './format'

const sum = (list, f) => list.reduce((a, t) => a + (f(t) || 0), 0)
export const isDone = (t) => t.status === 'Done'
export const isOpen = (t) => !isDone(t)

/** Hours a task has logged in a month (0 unless Done with a Completed Date in it). */
export const loggedIn = (t, ym) => (isDone(t) && inMonth(t.completed, ym) ? t.hours || 0 : 0)

/** Hours per story point over Done tasks that have both, or null. */
export function hoursPerPoint(list) {
  const both = list.filter((t) => isDone(t) && t.points > 0 && t.hours != null)
  const p = sum(both, (t) => t.points)
  return p ? sum(both, (t) => t.hours) / p : null
}

/** Overview → TEAM SUMMARY */
export function summary(tasks, ym) {
  const planned = sum(tasks, (t) => t.points)
  const completed = sum(tasks.filter(isDone), (t) => t.points)
  return {
    total: tasks.length,
    open: tasks.filter(isOpen).length,
    closed: tasks.filter(isDone).length,
    inProgress: tasks.filter((t) => t.status === 'In progress').length,
    notStarted: tasks.filter((t) => t.status === 'Not started').length,
    blocked: tasks.filter((t) => t.status === 'Blocked').length,
    planned,
    completed,
    donePct: planned ? (completed / planned) * 100 : 0,
    hours: sum(tasks, (t) => loggedIn(t, ym)),
  }
}

/** Personal tab header (B3:B6) */
export function personal(tasks, owner, ym) {
  const mine = tasks.filter((t) => t.owner === owner)
  return {
    mine,
    open: mine.filter(isOpen).length,
    doneMonth: mine.filter((t) => isDone(t) && inMonth(t.completed, ym)).length,
    ptsOpen: sum(mine.filter(isOpen), (t) => t.points),
    realMonth: sum(mine, (t) => loggedIn(t, ym)),
  }
}

/** What someone mostly works on: their top one or two pillars by task count. */
export function focusOf(tasks, owner) {
  const n = {}
  tasks.forEach((t) => t.owner === owner && t.pillar && (n[t.pillar] = (n[t.pillar] || 0) + 1))
  const top = Object.entries(n)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k)
  return top.length ? top.join(' & ') : 'No tasks yet'
}

/** Overview → BY PERSON */
export function byPerson(tasks, ym) {
  return TEAM.map((p) => {
    const mine = tasks.filter((t) => t.owner === p.name)
    const done = mine.filter(isDone)
    return {
      ...p,
      role: p.role || focusOf(tasks, p.name),
      planned: mine.length,
      completed: done.length,
      inProgress: mine.filter((t) => t.status === 'In progress').length,
      notStarted: mine.filter((t) => t.status === 'Not started').length,
      blocked: mine.filter((t) => t.status === 'Blocked').length,
      plannedPts: sum(mine, (t) => t.points),
      donePts: sum(done, (t) => t.points),
      hours: sum(mine, (t) => loggedIn(t, ym)),
      /* hours worked per story point, on Done tasks that have both */
      hrsPerPt: hoursPerPoint(done),
    }
  })
}

/** Overview → BY PILLAR */
export function byPillar(tasks) {
  return PILLARS.map((p) => {
    const list = tasks.filter((t) => t.pillar === p.name)
    return {
      ...p,
      tasks: list,
      planned: list.length,
      completed: list.filter(isDone).length,
      inProgress: list.filter((t) => t.status === 'In progress').length,
      notStarted: list.filter((t) => t.status === 'Not started').length,
      blocked: list.filter((t) => t.status === 'Blocked').length,
      open: list.filter(isOpen).length,
      points: sum(list, (t) => t.points),
      hours: sum(list, (t) => t.hours),
      owners: [...new Set(list.map((t) => t.owner))],
    }
  })
}

/** Overview → BY WORKSTREAM, for one pillar. Tasks without a workstream are left out, as on the sheet. */
export function byWorkstream(tasks, pillar) {
  const list = tasks.filter((t) => t.pillar === pillar && t.workstream)
  const names = [...new Set([...WORKSTREAMS.filter((w) => w.pillar === pillar).map((w) => w.name), ...list.map((t) => t.workstream)])]
  return names
    .map((name) => {
      const ws = list.filter((t) => t.workstream === name)
      return {
        name,
        planned: ws.length,
        completed: ws.filter(isDone).length,
        open: ws.filter(isOpen).length,
        points: sum(ws, (t) => t.points),
      }
    })
    .filter((w) => w.planned > 0)
    .sort((a, b) => b.planned - a.planned)
}

/** Overview → DAILY HOURS TRACKER: owner × day of month */
export function dailyHours(tasks, ym, owner) {
  const days = daysInMonth(ym)
  const out = Array.from({ length: days }, () => 0)
  tasks.forEach((t) => {
    if (owner && t.owner !== owner) return
    const h = loggedIn(t, ym)
    if (h) out[Number(t.completed.slice(8, 10)) - 1] += h
  })
  return out
}



/** Which bucket an open task's due date falls in */
export function dueBucket(t, today = todayISO()) {
  if (isDone(t)) return 'Done'
  if (!t.due) return 'No date'
  const n = diffDays(t.due, today)
  if (n < 0) return 'Overdue'
  if (n === 0) return 'Today'
  if (t.due <= addDays(today, 7)) return 'This week'
  return 'Later'
}
export const BUCKETS = ['Overdue', 'Today', 'This week', 'Later', 'No date', 'Done']

/** Rows that break the sheet's own rules, so hours or totals come out wrong */
export const HYGIENE = [
  { id: 'noHours', label: 'Done without hours', hint: 'Not counted in hours logged', test: (t) => isDone(t) && t.hours == null },
  { id: 'noCompleted', label: 'Done without a Completed Date', hint: 'Hours can’t be credited to a day', test: (t) => isDone(t) && !t.completed },
  { id: 'noPoints', label: 'No story points', hint: 'Left out of story points done', test: (t) => t.points == null },
  { id: 'futureDone', label: 'Completed date in the future', hint: 'Hours land on a day that hasn’t happened yet', test: (t) => isDone(t) && !!t.completed && t.completed > todayISO() },
  { id: 'noWorkstream', label: 'No Workstream picked', hint: 'Left out of By Workstream', test: (t) => !t.workstream },
  { id: 'noDue', label: 'Open with no Due Date', hint: 'Can’t be scheduled', test: (t) => isOpen(t) && !t.due },
]

/* ============================================================
   Month over month. Everything here is credited to a month by
   date: work done by its Completed Date, planned work by its
   Due Date. Months without tasks simply come out as zeros.
   ============================================================ */

/** "2026-11" shifted by n months: shiftMonth('2026-01', -1) → '2025-12' */
export function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** One month's numbers, for comparing with another month. */
export function monthStats(tasks, ym) {
  const done = tasks.filter((t) => isDone(t) && inMonth(t.completed, ym))
  const due = tasks.filter((t) => inMonth(t.due, ym))
  const dueDone = due.filter((t) => isDone(t) && t.completed)
  const hoursBy = (key) => {
    const out = {}
    done.forEach((t) => t[key] && (out[t[key]] = (out[t[key]] || 0) + (t.hours || 0)))
    return out
  }
  const doneBy = (key) => {
    const out = {}
    done.forEach((t) => t[key] && (out[t[key]] = (out[t[key]] || 0) + 1))
    return out
  }
  return {
    ym,
    done: done.length,
    hours: sum(done, (t) => t.hours),
    ptsDone: sum(done, (t) => t.points),
    hrsPerPt: hoursPerPoint(done),
    due: due.length,
    duePts: sum(due, (t) => t.points),
    onTime: dueDone.length ? (dueDone.filter((t) => t.completed <= t.due).length / dueDone.length) * 100 : null,
    people: new Set(done.map((t) => t.owner)).size,
    hoursByPerson: hoursBy('owner'),
    doneByPerson: doneBy('owner'),
    hoursByPillar: hoursBy('pillar'),
    doneByPillar: doneBy('pillar'),
    empty: done.length === 0 && due.length === 0,
  }
}

/** Months that have any dated work, newest first. */
export function monthsWithData(tasks) {
  const set = new Set()
  tasks.forEach((t) => {
    if (t.completed) set.add(t.completed.slice(0, 7))
    if (t.due) set.add(t.due.slice(0, 7))
  })
  return [...set].sort().reverse()
}

/* ============================================================
   The monthly board. Each month has its own board: the work
   completed that month plus everything still open. When a month
   ends, its totals are saved (closeMonth → archiveMonth in
   src/lib/api.js) for Insights, its completed tasks are deleted
   (endedTasks → deleteTasks), and open tasks carry over.
   ============================================================ */

/** Is a task on month ym's board? */
export function onBoard(t, ym) {
  if (!isDone(t)) return true // open work carries over
  if (t.completed) return t.completed.slice(0, 7) >= ym // done this month (or dated ahead, kept so it can be fixed)
  return !t.due || t.due.slice(0, 7) >= ym // done with no completed date: by due date
}
export const boardTasks = (tasks, ym) => tasks.filter((t) => onBoard(t, ym))

/** The totals saved when month ym closes: no task rows, only what Insights compares. */
export function closeMonth(tasks, ym) {
  const board = boardTasks(tasks, ym).filter((t) => !isDone(t) || !t.completed || t.completed.slice(0, 7) === ym)
  const { open, closed, inProgress, notStarted, blocked, planned, completed } = summary(board, ym)
  return {
    month: ym,
    closedAt: new Date().toISOString(),
    /* the board as it stood at the end of the month */
    summary: { tasks: board.length, open, closed, inProgress, notStarted, blocked, pointsPlanned: planned, pointsDone: completed },
    /* everything Insights shows for a month: totals plus by person and by pillar */
    stats: monthStats(board, ym),
  }
}

/** Tasks that leave the board when month ym starts: completed before it (open work carries over). */
export const endedTasks = (tasks, ym) => tasks.filter((t) => !onBoard(t, ym))
