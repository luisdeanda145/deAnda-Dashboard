/* ============================================================
   Board configuration — mirrors the "Lists" tab of the
   project board spreadsheet. When the backend is connected,
   these can be loaded from it instead (see src/lib/api.js).
   ============================================================ */

/** Who is signed in. Swap for the authenticated user later. */
export const USER = {
  name: 'Luis',
  email: 'luis@deanda.capital',
  role: 'Web & digital product',
}

export const WORKSPACE = {
  name: 'de Anda Capital',
  sub: 'Project Board',
}

/* The month the board reports on (the Overview's "Month" cell) follows the
   calendar; see the reporting-month state in src/App.jsx. */

/* ------------------------------------------------------------
   Team, pillars and workstreams can be edited from the app
   (Settings, Team, Pillars). The lists below are the defaults;
   the live lists are the `let` bindings further down, which
   applyDirectory() swaps for the edited ones. ES module
   bindings are live, so every importer sees the new lists.
   ------------------------------------------------------------ */

/** Team, column A of Lists. */
export const DEFAULT_TEAM = [{ name: 'Grace' }, { name: 'Hamza' }, { name: 'Brayden' }, { name: 'Jackson' }, { name: 'Isabel' }, { name: 'Luis' }, { name: 'Kelvin' }]

/** Status column. Anything without a status counts as open. */
export const STATUSES = [
  { id: 'Not started', tone: 'sky', icon: 'circle' },
  { id: 'In progress', tone: 'blue', icon: 'sync' },
  { id: 'Blocked', tone: 'red', icon: 'alert' },
  { id: 'Done', tone: 'teal', icon: 'check' },
]
export const statusTone = (s) => STATUSES.find((x) => x.id === s)?.tone || 'mute'

export const PRIORITIES = [
  { id: 'P0', label: 'P0 · Now', tone: 'red' },
  { id: 'P1', label: 'P1 · High', tone: 'amber' },
  { id: 'P2', label: 'P2 · Normal', tone: 'sky' },
  { id: 'P3', label: 'P3 · Low', tone: 'mute' },
]

/** Pillar tabs (column C) plus the to-do-only pillars (column E). */
export const DEFAULT_PILLARS = [
  { name: 'de Anda LABs', code: 'LB', tone: 'violet', blurb: 'de Anda Capital, Doorcount and Farm Program websites' },
  { name: 'PMC', code: 'PM', tone: 'blue', blurb: 'Marathon Management, Rainey Realty, Asset Management' },
  { name: 'PMC DOF', code: 'PD', tone: 'sky', blurb: 'GTM General, LinkedIn, SEO, Blogs, Cold call, Emails' },
  { name: 'Payment', code: 'PY', tone: 'teal', blurb: 'Mainspring, Ticketing ISV, Langoustine, FanFair, PayFac/ISO' },
  { name: 'Payroll DOF', code: 'PR', tone: 'green', blurb: 'Payroll' },
  { name: 'HealthCues', code: 'HC', tone: 'pink', blurb: 'HealthCues' },
  { name: 'Consulting Motions', code: 'CM', tone: 'amber', blurb: 'Vosk, Beecher (Alex Wall), Gateway, Rabine' },
  { name: 'EdgeFlo', code: 'EF', tone: 'orange', blurb: 'EdgeFlo AI' },
  { name: 'dAC Internal', code: 'IN', tone: 'ink', blurb: 'Operations, HR, Recruiting' },
  { name: 'Accounting', code: 'AC', tone: 'mute', blurb: 'Accounting' },
]
/** These stay on a person's tab only, so they never appear on a pillar tab. */
export const TODO_ONLY_PILLARS = ['Personal / Admin', 'Bronx Future Stars', 'Other']
export const pillarTone = (name) => PILLARS.find((p) => p.name === name)?.tone || 'mute'

/** Workstream → pillar it files under (columns K–L of Lists). */
export const DEFAULT_WORKSTREAMS = [
  ['de Anda Capital Website', 'de Anda LABs'],
  ['Doorcount Website', 'de Anda LABs'],
  ['Farm Program Website', 'de Anda LABs'],
  ['de Anda LABs', 'de Anda LABs'],
  ['Marathon Management', 'PMC'],
  ['Rainey Realty', 'PMC'],
  ['Asset Management', 'PMC'],
  ['GTM General', 'PMC DOF'],
  ['LinkedIn', 'PMC DOF'],
  ['SEO', 'PMC DOF'],
  ['Blogs', 'PMC DOF'],
  ['Cold call', 'PMC DOF'],
  ['Emails', 'PMC DOF'],
  ['Ticketing ISV DOF', 'Payment'],
  ['Langoustine', 'Payment'],
  ['FanFair Sales DOF', 'Payment'],
  ['PayFac/ISO DOF', 'Payment'],
  ['Mainspring', 'Payment'],
  ['HealthCues', 'HealthCues'],
  ['Vosk', 'Consulting Motions'],
  ['Beecher (Alex Wall)', 'Consulting Motions'],
  ['Gateway', 'Consulting Motions'],
  ['Rabine', 'Consulting Motions'],
  ['EdgeFlo AI', 'EdgeFlo'],
  ['Operations', 'dAC Internal'],
  ['HR', 'dAC Internal'],
  ['Recruiting', 'dAC Internal'],
  ['Team meetings', 'dAC Internal'],
  ['Accounting', 'Accounting'],
].map(([name, pillar]) => ({ name, pillar }))

/** Colours a pillar can take. */
export const TONES = ['violet', 'blue', 'sky', 'teal', 'green', 'pink', 'amber', 'orange', 'red', 'ink', 'mute']

/* the live lists */
export let TEAM = DEFAULT_TEAM
export let PILLARS = DEFAULT_PILLARS
export let WORKSTREAMS = DEFAULT_WORKSTREAMS
export let ALL_PILLARS = [...PILLARS.map((p) => p.name), ...TODO_ONLY_PILLARS]

/** Point the live lists at an edited directory ({ team, pillars, workstreams }). */
export function applyDirectory(dir) {
  TEAM = dir.team
  PILLARS = dir.pillars
  WORKSTREAMS = dir.workstreams
  ALL_PILLARS = [...PILLARS.map((p) => p.name), ...TODO_ONLY_PILLARS]
}

/** "Other" and "Payroll" belong to more than one pillar. */
export const SHARED_WORKSTREAMS = ['Payroll', 'Other']

/** Workstreams offered for a pillar in the task form. */
export const workstreamsFor = (pillar) => {
  const own = WORKSTREAMS.filter((w) => w.pillar === pillar).map((w) => w.name)
  const shared = pillar === 'Payment' || pillar === 'Payroll DOF' ? SHARED_WORKSTREAMS : ['Other']
  const list = [...own, ...shared]
  return list.length > 1 ? list : WORKSTREAMS.map((w) => w.name).concat(SHARED_WORKSTREAMS)
}
