// ============================================================
// The Project Board assistant (Supabase Edge Function "assistant").
//
// The dashboard sends { period, question, history }. This function:
//   1. checks the caller is signed in with an @deanda.capital account
//   2. loads that period's tasks, hours and figures from the database
//      (as the caller, so the same access rules apply as on the board)
//   3. reads the system prompt from public.assistant_settings (locked
//      table; read here with the secret key)
//   4. asks Claude for a short answer and returns { reply }
//
// Read-only: it never writes to the board.
// Secrets: ANTHROPIC_API_KEY (Edge Functions → Secrets). The Supabase
// URL and keys are provided to every Edge Function automatically.
// Deploy with verify_jwt off: the user check happens below.
// ============================================================
import Anthropic from 'npm:@anthropic-ai/sdk@1.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'

const MODEL = 'claude-opus-5-5'
const TEAM_DOMAIN = '@deanda.capital'
const ZONE = 'America/New_York'
const MAX_QUESTION = 2000
const MAX_TURNS = 6 // earlier messages kept for follow-up questions
const MAX_TURN_CHARS = 4000
const NOTE_CHARS = 240

const PERIODS = {
  today: 'Today',
  '3days': 'The last 3 days',
  week: 'This week (Monday to Sunday)',
  month: 'This month',
} as const
type Period = keyof typeof PERIODS

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS })

/* the project's keys: the newer named keys, or the legacy ones */
const named = (env: string, legacy: string) => {
  try {
    const keys = JSON.parse(Deno.env.get(env) ?? '{}')
    if (keys.default) return keys.default as string
  } catch {
    /* fall through */
  }
  return Deno.env.get(legacy) ?? ''
}
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const PUBLISHABLE = named('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
const SECRET = named('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')

/* ---------------- dates (New York time) ---------------- */
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay() // 0 = Sunday

function range(period: Period, today: string): [string, string] {
  if (period === 'today') return [today, today]
  if (period === '3days') return [addDays(today, -2), today]
  if (period === 'week') {
    const monday = addDays(today, -((weekday(today) + 6) % 7))
    return [monday, addDays(monday, 6)]
  }
  const first = `${today.slice(0, 8)}01`
  const next = addDays(`${today.slice(0, 8)}28`, 4).slice(0, 8) + '01'
  return [first, addDays(next, -1)]
}

/* ---------------- the board data for one period ---------------- */
type Task = {
  owner: string
  title: string
  pillar: string | null
  workstream: string | null
  priority: string | null
  status: string
  due: string | null
  completed: string | null
  points: number | null
  hours: number | null
  notes: string | null
}

const round = (n: number) => Math.round(n * 10) / 10
const add = (m: Record<string, number>, k: string, v: number) => (m[k] = (m[k] ?? 0) + v)
const rounded = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, round(v)]))
const oneLine = (s: string | null, max: number) => {
  if (!s) return ''
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

function boardData(tasks: Task[], team: string[], period: Period, today: string) {
  const [from, to] = range(period, today)
  const inRange = (d: string | null) => !!d && d >= from && d <= to
  const done = (t: Task) => t.status === 'Done'

  const finished = tasks.filter((t) => done(t) && inRange(t.completed))
  const due = tasks.filter((t) => inRange(t.due))
  const overdue = tasks.filter((t) => !done(t) && !!t.due && t.due < today)
  const blocked = tasks.filter((t) => t.status === 'Blocked')
  /* what goes to the model: work done or due in the period, plus anything blocked or late right now */
  const shown = tasks.filter((t) => (done(t) ? inRange(t.completed) || inRange(t.due) : inRange(t.due) || t.status === 'Blocked' || overdue.includes(t)))

  const hoursByPerson: Record<string, number> = Object.fromEntries(team.map((n) => [n, 0]))
  const hoursByPillar: Record<string, number> = {}
  const hoursByDay: Record<string, number> = {}
  const doneByPerson: Record<string, number> = {}
  for (const t of finished) {
    const h = Number(t.hours) || 0
    add(hoursByPerson, t.owner, h)
    add(hoursByPillar, t.pillar || 'No pillar', h)
    add(hoursByDay, t.completed!, h)
    doneByPerson[t.owner] = (doneByPerson[t.owner] ?? 0) + 1
  }
  const dueDone = due.filter((t) => done(t) && t.completed)
  const onTime = dueDone.length ? Math.round((100 * dueDone.filter((t) => t.completed! <= t.due!).length) / dueDone.length) : null

  const figures = {
    period: PERIODS[period],
    dates: from === to ? from : `${from} to ${to}`,
    today,
    tasks_done: finished.length,
    hours_logged: round(finished.reduce((a, t) => a + (Number(t.hours) || 0), 0)),
    story_points_done: round(finished.reduce((a, t) => a + (Number(t.points) || 0), 0)),
    tasks_due_in_period: due.length,
    due_in_period_still_open: due.filter((t) => !done(t)).length,
    on_time_rate_percent: onTime,
    blocked_now: blocked.length,
    overdue_now: overdue.length,
    hours_by_person: rounded(hoursByPerson),
    tasks_done_by_person: doneByPerson,
    hours_by_pillar: rounded(hoursByPillar),
    hours_by_day: rounded(hoursByDay),
  }

  const lines = shown
    .sort((a, b) => (a.owner + (a.due ?? '')).localeCompare(b.owner + (b.due ?? '')))
    .map((t) =>
      [
        t.owner,
        oneLine(t.title, 200),
        [t.pillar, t.workstream].filter(Boolean).join(' / ') || '-',
        t.priority || '-',
        t.status + (!done(t) && t.due && t.due < today ? ' (OVERDUE)' : ''),
        `due ${t.due ?? '-'}`,
        `done ${t.completed ?? '-'}`,
        `${t.hours ?? '-'}h`,
        `${t.points ?? '-'}pts`,
        oneLine(t.notes, NOTE_CHARS),
      ].join(' | '),
    )

  return [
    `<board_data period="${PERIODS[period]}">`,
    `Figures: ${JSON.stringify(figures)}`,
    `Team: ${team.join(', ')}`,
    `Tasks (${lines.length}) — owner | title | pillar / workstream | priority | status | due | completed | hours | points | notes:`,
    ...lines,
    '</board_data>',
  ].join('\n')
}

/* ---------------- request ---------------- */
type Turn = { role: 'user' | 'assistant'; text: string }

/** keep the last few turns, starting with the user and alternating, as the API requires */
function cleanHistory(raw: unknown): Anthropic.MessageParam[] {
  if (!Array.isArray(raw)) return []
  const turns = raw
    .filter((t): t is Turn => !!t && (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string' && t.text.trim() !== '')
    .slice(-MAX_TURNS)
  while (turns.length && turns[0].role !== 'user') turns.shift()
  const out: Anthropic.MessageParam[] = []
  for (const t of turns) {
    if (out.length && out[out.length - 1].role === t.role) continue
    out.push({ role: t.role, content: t.text.slice(0, MAX_TURN_CHARS) })
  }
  if (out.length && out[out.length - 1].role === 'user') out.pop() // the new question follows
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reply({ error: 'Use POST.' }, 405)

  /* 1. who's asking */
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return reply({ error: 'Sign in to use the assistant.' }, 401)
  const asUser = createClient(SUPABASE_URL, PUBLISHABLE, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: who, error: authError } = await asUser.auth.getUser(jwt)
  const email = who?.user?.email?.toLowerCase() ?? ''
  if (authError || !email.endsWith(TEAM_DOMAIN)) return reply({ error: 'The assistant is only for de Anda Capital accounts.' }, 403)

  /* 2. what they asked */
  let body: { period?: string; question?: string; history?: unknown }
  try {
    body = await req.json()
  } catch {
    return reply({ error: 'Bad request.' }, 400)
  }
  const period = (body.period ?? 'today') as Period
  if (!(period in PERIODS)) return reply({ error: 'Unknown period.' }, 400)
  const question = String(body.question ?? '').trim()
  if (!question) return reply({ error: 'Ask a question first.' }, 400)
  if (question.length > MAX_QUESTION) return reply({ error: `Keep questions under ${MAX_QUESTION} characters.` }, 400)

  /* 3. the board (as the caller) and the prompt (locked table, secret key) */
  const admin = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } })
  const [tasksRes, teamRes, promptRes] = await Promise.all([
    asUser.from('tasks').select('owner, title, pillar, workstream, priority, status, due, completed, points, hours, notes').limit(5000),
    asUser.from('team_members').select('name').order('sort'),
    admin.from('assistant_settings').select('value').eq('key', 'prompt').maybeSingle(),
  ])
  if (tasksRes.error || teamRes.error) return reply({ error: 'Couldn’t load the board.' }, 500)
  const system = promptRes.data?.value?.trim()
  if (!system) return reply({ error: 'The assistant’s prompt isn’t set up yet.' }, 500)

  const today = ymd(new Date())
  const data = boardData(tasksRes.data as Task[], (teamRes.data ?? []).map((p) => p.name), period, today)

  /* 4. ask Claude */
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return reply({ error: 'The assistant isn’t connected to Claude yet.' }, 500)
  const anthropic = new Anthropic({ apiKey })
  try {
    const res = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      /* if a safety check declines, the API retries on a suitable model in the same call */
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [
        ...cleanHistory(body.history),
        {
          role: 'user',
          content: [
            { type: 'text', text: data },
            { type: 'text', text: `Asked by ${who.user!.user_metadata?.full_name || email}: ${question}` },
          ],
        },
      ],
    })
    if (res.stop_reason === 'refusal') return reply({ reply: 'I can’t help with that one. Try asking about the board in a different way.' })
    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')
      .trim()
    return reply({ reply: text || 'I don’t have an answer for that.' })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return reply({ error: 'The assistant is busy. Try again in a minute.' }, 429)
    if (e instanceof Anthropic.AuthenticationError) return reply({ error: 'The assistant’s Claude key isn’t working. Check ANTHROPIC_API_KEY.' }, 500)
    if (e instanceof Anthropic.APIError) return reply({ error: 'Claude couldn’t answer right now. Try again shortly.' }, 502)
    return reply({ error: 'Something went wrong. Try again.' }, 500)
  }
})
