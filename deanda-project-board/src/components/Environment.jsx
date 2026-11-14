import { BACKGROUNDS, seasonFor } from '../lib/season'
import { todayISO } from '../lib/format'

/** The room photo the windows float in. Seasonal versions take over around
    Thanksgiving and through December (see src/lib/season.js). */
export default function Environment({ today = todayISO(), preview = null }) {
  const season = preview || seasonFor(today)
  return (
    <div className="env" aria-hidden="true" data-season={season}>
      <div className="env-photo" style={season === 'default' ? undefined : { backgroundImage: `url('${BACKGROUNDS[season]}')` }} />
      <div className="env-veil" />
    </div>
  )
}
