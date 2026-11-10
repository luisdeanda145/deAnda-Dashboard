import { useState } from 'react'
import { num } from '../lib/format'

/* ------------------------------------------------------------------
   Tick meter — the row of thin bars under Delivery Rate / Campaigns.
   segments: [{ to: 0–100, tone, label }] in order; the rest is muted.
   ------------------------------------------------------------------ */
export function TickBar({ segments, count = 58, delay = 0 }) {
  const [hover, setHover] = useState(-1)
  const toneAt = (p) => segments.findIndex((s) => p <= s.to)
  const seg = segments[hover]
  const from = hover > 0 ? segments[hover - 1].to : 0

  return (
    <div className="ticks" onPointerLeave={() => setHover(-1)}>
      {Array.from({ length: count }, (_, i) => {
        const s = toneAt(((i + 0.5) / count) * 100)
        return (
          <i
            key={i}
            className={`tick ${s < 0 ? 'mute' : segments[s].tone}${hover >= 0 && s !== hover ? ' dim' : ''}`}
            style={{ '--i': i, '--d': delay }}
            onPointerEnter={() => setHover(s)}
          />
        )
      })}
      {seg && (
        <span className="chip-tip" style={{ left: `${(from + seg.to) / 2}%` }}>
          <i className={`dot ${seg.tone}`} />
          {seg.label}
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------
   Donut — three rounded arcs with gaps and % bubbles on top.
   ------------------------------------------------------------------ */
const R = 60
const SW = 17
const C = 2 * Math.PI * R
const GAP = SW + 7

export function Donut({ data, active, onActive, total, unit = 'messages' }) {
  const sum = data.reduce((a, d) => a + d.value, 0) || 1
  /* small slices get a floor so they still read as an arc; labels keep the true share */
  const raw = data.map((d) => d.value / sum)
  const floored = raw.map((f) => (f > 0 ? Math.max(f, 0.085) : 0))
  const fsum = floored.reduce((a, b) => a + b, 0) || 1
  const fracs = floored.map((f) => f / fsum)
  const arcs = data.map((d, i) => ({ ...d, frac: fracs[i], real: raw[i], start: fracs.slice(0, i).reduce((a, b) => a + b, 0) }))
  const hot = arcs.find((a) => a.id === active)

  return (
    <div className="donut" onPointerLeave={() => onActive(null)}>
      <svg viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={R} className="donut-track" strokeWidth={SW} />
        {arcs.map((a, i) => (
          <circle
            key={a.id}
            cx="80"
            cy="80"
            r={R}
            className={`arc ${a.tone}${active && active !== a.id ? ' dim' : ''}${active === a.id ? ' on' : ''}`}
            strokeWidth={SW}
            strokeDasharray={`${Math.max(0.1, a.frac * C - GAP)} ${C}`}
            strokeDashoffset={-(a.start * C + GAP / 2)}
            transform="rotate(-84 80 80)"
            style={{ '--i': i }}
            onPointerEnter={() => onActive(a.id)}
          />
        ))}
      </svg>
      {arcs.map((a, i) => {
        if (!a.value) return null
        const ang = ((a.start + a.frac / 2) * 360 - 84) * (Math.PI / 180)
        return (
          <span
            key={a.id}
            className={`bubble${active === a.id ? ' on' : ''}`}
            style={{ left: `${50 + (R / 80) * 50 * Math.cos(ang)}%`, top: `${50 + (R / 80) * 50 * Math.sin(ang)}%`, '--i': i }}
          >
            {Math.round(a.real * 100)}%
          </span>
        )
      })}
      <div className="donut-mid">
        <strong key={hot?.id || 'all'}>{hot ? num(hot.value) : num(total)}</strong>
        <span>{hot ? hot.label : unit}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   Stacked column beside Top Contacts.
   ------------------------------------------------------------------ */
export function StackBar({ rows, active, onActive }) {
  /* named contacts get a floor so a 4% slice is still a visible block */
  const named = rows.filter((r) => r.tone !== 'hatch')
  const sizes = named.map((r) => Math.max(10, r.share))
  const rest = 100 - sizes.reduce((a, b) => a + b, 0)
  return (
    <div className="stack" onPointerLeave={() => onActive(-1)}>
      {rows.map((r, i) => (
        <i
          key={r.name}
          className={`stack-seg ${r.tone}${active >= 0 && active !== i ? ' dim' : ''}`}
          style={{ flexGrow: r.tone === 'hatch' ? rest : sizes[i], '--i': i }}
          onPointerEnter={() => onActive(i)}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------
   Messages by month — closed conversations as a solid pill with the
   open ones stacked above as a hatched cap.
   ------------------------------------------------------------------ */
const MONTH_LABELS = { open: 'Open', closed: 'Closed' }

export function MonthBars({ data, pinned, onPin, fmt = num, labels = MONTH_LABELS, tipTitle }) {
  const [hover, setHover] = useState(-1)
  const on = hover >= 0 ? hover : pinned
  const max = Math.max(...data.map((d) => d.open + d.closed)) || 1
  const h = (v) => (v / max) * 84
  const d = data[on]

  return (
    <div className={`months${data.length > 16 ? ' dense' : ''}`} style={{ '--cols': data.length }} onPointerLeave={() => setHover(-1)}>
      <div className="months-plot">
        {data.map((m, i) => (
          <button
            type="button"
            key={m.m}
            className={`mcol${i === on ? ' on' : ''}${m.closed ? '' : ' zero'}${m.future ? ' future' : ''}`}
            style={{ '--i': i }}
            onPointerEnter={() => setHover(i)}
            onClick={() => onPin(i)}
            aria-label={`${m.m}: ${fmt(m.open + m.closed)} total`}
          >
            {m.open > 0 && <i className="mcap" style={{ height: `${Math.max(3, h(m.open))}%` }} />}
            <i className="mbar" style={{ height: `${h(m.closed)}%` }} />
          </button>
        ))}
        {d && (
          <div
            className="mtip"
            key={on}
            style={{ left: `${((on + 0.5) / data.length) * 100}%`, bottom: `calc(${Math.max(d.open ? 3 : 0, h(d.open)) + h(d.closed)}% + 20px)` }}
          >
            <strong>{tipTitle ? tipTitle(d) : `${fmt(d.open + d.closed)} Total`}</strong>
            {labels.open && (
              <span>
                <i className="ring" /> {fmt(d.open)} {labels.open}
              </span>
            )}
            <span>
              <i className="dot blue" /> {fmt(d.closed)} {labels.closed}
            </span>
          </div>
        )}
      </div>
      <div className="months-x">
        {data.map((m, i) => (
          <span key={m.m} className={`${i === on ? 'on' : ''}${m.tick === false ? ' hide' : ''}`}>
            {m.m}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   White pill bars on the blue Contacts widget.
   ------------------------------------------------------------------ */
export function PillBars({ data, fmt = num }) {
  const [hover, setHover] = useState(-1)
  const max = Math.max(...data.map((d) => d.v)) || 1
  return (
    <div className="pills" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }} onPointerLeave={() => setHover(-1)}>
      {data.map((d, i) => (
        <div key={d.label} className={`pill-col${hover === i ? ' on' : ''}${hover >= 0 && hover !== i ? ' dim' : ''}`} onPointerEnter={() => setHover(i)}>
          <div className="pill-track">
            {hover === i && (
              <span className="chip-tip up">
                {d.label} · {fmt(d.v)}
              </span>
            )}
            {d.live && <i className="pill-dot" />}
            <i className={`pill${d.live ? ' live' : ''}`} style={{ height: `${Math.max(4, (d.v / max) * 100)}%`, '--i': i }} />
          </div>
          <span>{d.m}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------
   Area line for Texts Sent. Drawn in a stretched viewBox; the dots
   and the cursor line are HTML so they stay round.
   ------------------------------------------------------------------ */
function smooth(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  return d
}

export function AreaLine({ points, ticks, label, fmt = num }) {
  const [hover, setHover] = useState(-1)
  const W = 300
  const H = 100
  const lo = Math.min(...points) * 0.82
  const hi = Math.max(...points) * 1.04
  const span = hi - lo || 1
  const xy = points.map((v, i) => [(i / Math.max(1, points.length - 1)) * W, H - ((v - lo) / span) * H])
  const line = smooth(xy)
  const at = hover >= 0 ? hover : points.length - 1
  const pos = (i) => ({ left: `${(xy[i][0] / W) * 100}%`, top: `${(xy[i][1] / H) * 100}%` })

  return (
    <div className="area">
      <div className="area-plot" onPointerLeave={() => setHover(-1)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="area-fill" d={`${line} L${W},${H + 20} L0,${H + 20} Z`} fill="url(#areaFill)" />
          <path className="area-line" d={line} pathLength="1" />
        </svg>
        {hover >= 0 && <i className="area-cursor" style={{ left: pos(hover).left }} />}
        <i className={`area-dot${hover >= 0 ? ' hover' : ''}`} style={pos(at)} />
        {hover >= 0 && (
          <span className="chip-tip up" style={{ left: pos(hover).left, top: pos(hover).top }}>
            {label(hover)} · {fmt(points[hover])}
          </span>
        )}
        <div className="area-hit">
          {points.map((_, i) => (
            <i key={i} onPointerEnter={() => setHover(i)} />
          ))}
        </div>
      </div>
      <div className="area-x">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  )
}
