/* ============================================================
   The team, pillars and workstreams as edited in the app.

   Stored in this browser (localStorage) until the backend is
   connected; then load and save them through src/lib/api.js
   instead. The shape:
   {
     team:        [{ name, role? }]
     pillars:     [{ name, code, tone, blurb }]
     workstreams: [{ name, pillar }]
   }
   ============================================================ */
import { DEFAULT_PILLARS, DEFAULT_TEAM, DEFAULT_WORKSTREAMS } from '../data/board'

const KEY = 'dac-board-directory'

export const defaultDirectory = () => ({ team: DEFAULT_TEAM, pillars: DEFAULT_PILLARS, workstreams: DEFAULT_WORKSTREAMS })

export function loadDirectory() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved && Array.isArray(saved.team) && Array.isArray(saved.pillars) && Array.isArray(saved.workstreams)) return saved
  } catch {
    /* fall through to the defaults */
  }
  return defaultDirectory()
}

export function saveDirectory(dir) {
  try {
    localStorage.setItem(KEY, JSON.stringify(dir))
  } catch {
    /* storage can be unavailable (private windows); edits then last for the session */
  }
}

/** Two-letter code for a pillar's badge: "Health Cues" → "HC", "EdgeFlo" → "ED". */
export function codeFor(name) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const code = words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '').slice(0, 2)
  return code.toUpperCase()
}

export const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()
