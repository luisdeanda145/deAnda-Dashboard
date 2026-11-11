const nf = new Intl.NumberFormat('en-US')

export const num = (n) => nf.format(Math.round(n))
export const pct = (n, digits = 1) => `${Math.abs(n).toFixed(digits).replace(/\.0$/, '')}%`

/** Hours with at most one decimal: 12, 12.5, 0.3 */
/** Story points: "3 pts", "—" when unset */
export const pts = (n) => (n == null || Number.isNaN(n) ? '—' : `${nf.format(Math.round(n * 10) / 10)} pts`)

export const hrs = (n) => {
  if (n == null || Number.isNaN(n)) return '—'
  const r = Math.round(n * 10) / 10
  return nf.format(r)
}

/* "Good Afternoon" by the visitor's own clock */
export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'Good Evening'
  if (h < 12) return 'Good Morning'
  if (h < 18) return 'Good Afternoon'
  return 'Good Evening'
}

export const initials = (name) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')

/* ---------------- dates ----------------
   Everything is stored as an ISO day string, YYYY-MM-DD, exactly
   as the spreadsheet's Due Date / Completed Date columns. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const pad = (n) => String(n).padStart(2, '0')
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => iso(new Date())
export const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s, n) => {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000)

/** "Nov 10" */
export const fmtDay = (s) => {
  if (!s) return '—'
  const d = parse(s)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}
/** "Tue" */
export const dow = (s) => DOW[parse(s).getDay()]
/** "November 2026" from "2026-11" */
export const fmtMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return `${LONG[m - 1]} ${y}`
}
export const shortMonth = (ym) => MONTHS[Number(ym.split('-')[1]) - 1]
export const daysInMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
export const inMonth = (s, ym) => !!s && s.startsWith(ym)

/* ---------------- weeks (Monday to Sunday) ---------------- */
/** The Monday of the week a day falls in */
export const weekStart = (s) => addDays(s, -((parse(s).getDay() + 6) % 7))
export const sameWeek = (a, b) => weekStart(a) === weekStart(b)

/** "Nov 9 – 15", or "Oct 26 – Nov 1" across a month end */
export function fmtRange(a, b) {
  const x = parse(a)
  const y = parse(b)
  return x.getMonth() === y.getMonth() ? `${MONTHS[x.getMonth()]} ${x.getDate()} – ${y.getDate()}` : `${fmtDay(a)} – ${fmtDay(b)}`
}

/** "Wed, Nov 11" */
export const fmtDow = (s) => `${dow(s)}, ${fmtDay(s)}`

/** A week's name relative to today: "This week", "Last week", "Next week", or null for other weeks */
export function weekName(monday, today = todayISO()) {
  const n = diffDays(monday, weekStart(today)) / 7
  if (n === 0) return 'This week'
  if (n === -1) return 'Last week'
  if (n === 1) return 'Next week'
  return null
}

/**
 * Sort key that puts the present first and the past below it:
 *   today → the rest of this week (soonest first, then earlier days)
 *   → past weeks (most recent first) → future weeks (soonest first) → no date
 */
export function recencyRank(s, today = todayISO()) {
  if (!s) return 5e6
  const n = diffDays(s, today)
  if (sameWeek(s, today)) return n >= 0 ? n : 100 - n
  if (n < 0) return 1e6 - n
  return 3e6 + n
}

/** A day's name relative to today, always with its date: "Today · Wed, Nov 11", "Thu, Nov 12" */
export function dayName(s, today = todayISO()) {
  const n = diffDays(s, today)
  if (n === 0) return `Today · ${fmtDow(s)}`
  if (n === 1) return `Tomorrow · ${fmtDow(s)}`
  if (n === -1) return `Yesterday · ${fmtDow(s)}`
  return fmtDow(s)
}

/** Label for an open task's due date, always with the date:
    "Today · Nov 11", "Tomorrow · Nov 12", "2d late · Nov 9", "Fri, Nov 13", "Nov 24" */
export function dueLabel(s, today = todayISO()) {
  if (!s) return 'No date'
  const n = diffDays(s, today)
  if (n === 0) return `Today · ${fmtDay(s)}`
  if (n === 1) return `Tomorrow · ${fmtDay(s)}`
  if (n < 0) return `${-n}d late · ${fmtDay(s)}`
  if (n < 14) return fmtDow(s)
  return fmtDay(s)
}

/** Label for a past date such as a completion: "Today · Nov 11", "Tue, Nov 10" this week, else "Nov 3" */
export function pastLabel(s, today = todayISO()) {
  if (!s) return 'No date'
  if (s === today) return `Today · ${fmtDay(s)}`
  return sameWeek(s, today) ? fmtDow(s) : fmtDay(s)
}
