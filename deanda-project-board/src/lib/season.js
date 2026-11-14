/* ============================================================
   Seasonal backgrounds, every year:
     fall      — from a week before Thanksgiving (US, the 4th
                 Thursday of November) through Thanksgiving Day
     Christmas — December 1 through December 31
     otherwise — the usual room
   Dates are 'YYYY-MM-DD' in the viewer's own calendar, so the
   switch happens at their midnight.
   ============================================================ */
const pad = (n) => String(n).padStart(2, '0')

/** Thanksgiving Day for a year, e.g. 2026 → '2026-11-26' */
export function thanksgiving(year) {
  const firstDow = new Date(year, 10, 1).getDay() // 0 = Sunday … 4 = Thursday
  const firstThursday = 1 + ((4 - firstDow + 7) % 7)
  return `${year}-11-${pad(firstThursday + 21)}`
}

const shift = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(y, m - 1, d + days)
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}

/** Preview a season everywhere ('fall' or 'christmas'); null follows the calendar. */
const FORCE = null

/** Which background a day gets: 'fall', 'christmas' or 'default' */
export function seasonFor(iso) {
  if (FORCE) return FORCE
  const year = Number(iso.slice(0, 4))
  const tg = thanksgiving(year)
  if (iso >= shift(tg, -7) && iso <= tg) return 'fall'
  if (iso.slice(5, 7) === '12') return 'christmas'
  return 'default'
}

export const BACKGROUNDS = {
  default: '/background.jpg',
  fall: '/background-autumn.webp',
  christmas: '/background-christmas.webp',
}
