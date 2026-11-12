/* ============================================================
   UI sounds (made with ElevenLabs, trimmed to ~1 s, with a 5 ms
   fade-in so they don't pop):
     tab   — a sidebar or phone tab is selected
     added — a task is added
   Played through Web Audio: each file is fetched and decoded
   once, then every play is instant and quick clicks can overlap.
   Volume and on/off come from Settings.
   ============================================================ */
const FILES = { tab: '/sounds/tab-select.mp3', added: '/sounds/task-added.mp3' }

let ctx = null
const buffers = {}
let prefs = { on: true, volume: 0.5 }

/** Settings → Sounds calls this whenever the switch or slider changes. */
export function setSoundPrefs(on, volume) {
  prefs = { on, volume: Math.max(0, Math.min(1, volume)) }
}

function audio() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  /* fetch and decode in the background; the first play after this is instant */
  for (const [name, url] of Object.entries(FILES)) {
    buffers[name] = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .catch(() => null)
  }
  return ctx
}

/** Browsers only allow audio after the person interacts, so warm up on the first tap or key. */
if (typeof window !== 'undefined') {
  const warm = () => {
    audio()?.resume?.()
    removeEventListener('pointerdown', warm, true)
    removeEventListener('keydown', warm, true)
  }
  addEventListener('pointerdown', warm, true)
  addEventListener('keydown', warm, true)
}

/** Plays one of the UI sounds, if sounds are on. Never throws. */
export async function play(name) {
  try {
    if (!prefs.on || prefs.volume <= 0) return
    const ac = audio()
    if (!ac) return
    if (ac.state === 'suspended') await ac.resume()
    const buf = await buffers[name]
    if (!buf) return
    const src = ac.createBufferSource()
    const gain = ac.createGain()
    /* rise from silence over 5 ms: an instant jump from 0 is heard as a pop */
    const t = ac.currentTime
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(prefs.volume, t + 0.005)
    src.buffer = buf
    src.connect(gain).connect(ac.destination)
    src.start(t)
  } catch {
    /* a sound is never worth an error */
  }
}
