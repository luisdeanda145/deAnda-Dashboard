/* ============================================================
   Seasonal backgrounds, every year:
     Christmas — December 1 through December 31
     otherwise — the usual room
   Dates are 'YYYY-MM-DD' in the viewer's own calendar, so the
   switch happens at their midnight.
   ============================================================ */

/** Preview a season everywhere ('christmas'); null follows the calendar. */
const FORCE = null

/** Which background a day gets: 'christmas' or 'default' */
export function seasonFor(iso) {
  if (FORCE) return FORCE
  if (iso.slice(5, 7) === '12') return 'christmas'
  return 'default'
}

export const BACKGROUNDS = {
  default: '/background.jpg',
  christmas: '/background-christmas.webp',
}
