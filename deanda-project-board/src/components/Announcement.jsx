import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { useApp } from '../lib/store'
import { markAnnouncementSeen, recordAnnouncement } from '../lib/announcement'

const HOLD_MS = 1500

const PROMPT = `You help me run the de Anda Capital Project Board, our team's task dashboard (deanda-dashboard.vercel.app). It reads live from the Supabase project "Project Board" (id cdycjbsnitayhsxditll). Only use that project.

How the board works:
- Every task is a row in public.tasks: owner, title, pillar, workstream, priority, status, due, completed, points, hours, notes.
- Owner is a person in public.team_members. Pillar and workstream come from public.pillars and public.workstreams. Look these up; don't guess.
- Status: Not started, In progress, Blocked, Done. Priority: P0 (urgent) to P3.
- Dates are YYYY-MM-DD, New York time. Set "completed" only when status is Done.
- hours = time actually spent; points = effort estimate. Leave blank if unknown.
- At the start of each month, completed tasks are cleared and open tasks carry over, so only work with the current month.

What I'll ask you to do:
- Add tasks I describe, or pull action items from Google Drive docs and meeting notes.
- Update tasks (status, hours, dates), or tell me what's open, late or blocked.

Rules:
- Before writing, show me a short table of what you'll add or change, and wait for "go".
- Check for a similar existing task for that person first, and suggest updating it instead of duplicating.
- Never delete tasks or change tables unless I ask.
- After writing, confirm in one line.`

/**
 * A one-time note to the team, shown the first time each person opens the
 * board. It can't be dismissed by accident: the button has to be held down.
 */
export default function Announcement({ onDone }) {
  const { toast } = useApp()
  const [holding, setHolding] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    recordAnnouncement() // shown to them
    return () => clearTimeout(timer.current)
  }, [])

  const start = () => {
    if (timer.current) return
    setHolding(true)
    timer.current = setTimeout(() => {
      timer.current = null
      markAnnouncementSeen()
      recordAnnouncement({ acknowledged: true })
      onDone()
    }, HOLD_MS)
  }
  const stop = () => {
    clearTimeout(timer.current)
    timer.current = null
    setHolding(false)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT)
      toast({ icon: 'copy', title: 'Prompt copied', text: 'Paste it into your Claude project’s instructions' })
    } catch {
      toast({ icon: 'alert', title: 'Couldn’t copy', text: 'Select the prompt and copy it by hand' })
    }
  }

  return (
    <div className="sheet-wrap">
      <section className="sheet task-sheet announce" role="dialog" aria-modal="true" aria-labelledby="announce-title">
        <header>
          <span className="tu-ic">
            <Icon name="sparkle" size={21} />
          </span>
          <div>
            <h2 id="announce-title">Claude connectivity update</h2>
            <p>An update for the team</p>
          </div>
        </header>

        <p className="an-lead">
          You can now ask Claude to add and update tasks on this board for you. Describe a task in plain words, or point Claude at a Google Drive doc or
          meeting notes and it will pull out the action items. It always shows you what it’s about to change and waits for your “go”.
        </p>

        <h3 className="an-h">Set it up (about 5 minutes)</h3>
        <ol className="an-steps">
          <li>
            In <b>Claude</b>, open <b>Settings → Connectors</b> and connect <b>Supabase</b>. Sign in with your @deanda.capital account.
          </li>
          <li>
            Go back to <b>Claude</b> and create a new <b>Project</b> (call it “Project Board”).
          </li>
          <li>
            Paste the prompt below into the project’s <b>instructions</b>, then start a chat in it and ask Claude to add a task, e.g. <i>“Add a P1 for me: send the Marathon model to David, due Friday.”</i>
          </li>
        </ol>
        <p className="an-note">
          <Icon name="help" size={15} /> If Supabase doesn’t show the “Project Board” project, message me.
        </p>

        <div className="an-prompt">
          <div className="an-prompt-head">
            <span>Prompt for your Claude project</span>
            <button type="button" className="chip" onClick={copy}>
              <Icon name="copy" size={14} /> Copy
            </button>
          </div>
          <pre tabIndex={0}>{PROMPT}</pre>
        </div>

        <p className="an-sign">-Luis</p>

        <footer>
          <span className="ts-rule">Press and hold to continue</span>
          <button
            type="button"
            className={`cta an-hold${holding ? ' holding' : ''}`}
            style={{ '--hold': `${HOLD_MS}ms` }}
            onPointerDown={start}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && (e.preventDefault(), start())}
            onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && stop()}
            onBlur={stop}
          >
            <i className="an-fill" />
            <span>
              <Icon name="check" size={16} stroke={2.4} /> I understand
            </span>
          </button>
        </footer>
      </section>
    </div>
  )
}
