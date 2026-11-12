import { useState } from 'react'
import Icon from '../components/Icon'
import { Avatar, PageHead, Segmented, Select, Stat } from '../components/ui'
import { TEAM, USER } from '../data/board'
import { fmtMonth, todayISO } from '../lib/format'
import { isDone, personal } from '../lib/selectors'
import DateGroups from '../components/DateGroups'
import Messages, { MessagesButton } from '../components/Messages'
import { useApp } from '../lib/store'

const FILTERS = ['All', 'Open', 'Completed']

export default function MyWork() {
  const { tasks, month, me, setMe, addTask, openTask, toast } = useApp()
  const [filter, setFilter] = useState('All')
  const [draft, setDraft] = useState('')
  const [msgOpen, setMsgOpen] = useState(false)
  const p = personal(tasks, me, month)
  const today = todayISO()

  const add = (e) => {
    e.preventDefault()
    const title = draft.trim()
    if (!title) return
    addTask({ title, owner: me, pillar: null, workstream: null, priority: 'P1', status: 'Not started', due: today, completed: null, points: null, hours: null, notes: null })
    toast({ icon: 'plus', title: 'Added for today', text: 'Open it to set pillar and hours' })
    setDraft('')
    if (filter === 'Completed') setFilter('All') // so the new task is visible
  }

  const open = p.mine.filter((t) => !isDone(t))
  const done = p.mine.filter(isDone)
  const showOpen = filter !== 'Completed' && open.length > 0
  const showDone = filter !== 'Open' && done.length > 0

  const title = me === USER.name ? 'My Work' : `${me}’s Tasks`
  return (
    <>
      <PageHead title={title} sub={`${me}’s tab · ${fmtMonth(month)} to-do list`}>
        <MessagesButton open={msgOpen} onClick={() => setMsgOpen((o) => !o)} />
        <Select
          value={me}
          options={TEAM.map((x) => x.name)}
          onChange={setMe}
          render={(n) => (
            <span className="sel-person">
              <Avatar person={n} size={22} /> {n}
            </span>
          )}
        />
        <Segmented value={filter} options={FILTERS} onChange={setFilter} />
      </PageHead>

      <div className="stats">
        <Stat d={1} icon="task" label="Open tasks" value={p.open} fmt={(v) => Math.round(v)} />
        <Stat d={2} icon="check" label="Done this month" value={p.doneMonth} fmt={(v) => Math.round(v)} />
        <Stat d={3} icon="target" label="Story points still open" value={p.ptsOpen} />
        <Stat d={4} icon="bolt" label="Hours this month" value={p.realMonth} />
      </div>

      {msgOpen && <Messages key={me} onClose={() => setMsgOpen(false)} />}

      <form className="add-task rise" style={{ '--d': 5 }} onSubmit={add}>
        <Icon name="plus" size={18} stroke={2} />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Add a task to ${me}’s tab for today and press Enter`} />
        <button type="button" className="chip" onClick={() => openTask({ owner: me, title: draft })}>
          Details
        </button>
        <kbd>↵</kbd>
      </form>

      {showOpen && (
        <section className="list-part">
          {filter === 'All' && (
            <h2 className="part-head rise" style={{ '--d': 6 }}>
              Open <span>{open.length}</span>
            </h2>
          )}
          <DateGroups key={`${me}-open`} tasks={open} mode="open" />
        </section>
      )}
      {showDone && (
        <section className="list-part done-part">
          <h2 className="part-head rise" style={{ '--d': 6 }}>
            <i className="done-dot" /> Completed <span>{done.length}</span>
            <small>by completed date, newest first</small>
          </h2>
          <DateGroups key={`${me}-done`} tasks={done} mode="done" limit={40} />
        </section>
      )}
      {!showOpen && !showDone && (
        <div className="card empty-card rise" style={{ '--d': 6 }}>
          <Icon name="check" size={26} />
          <b>{filter === 'Open' ? 'Nothing open' : 'Nothing here yet'}</b>
          <span>{filter === 'Open' ? `${me} has no open tasks on this board.` : 'Tasks will appear here as they’re logged.'}</span>
        </div>
      )}
    </>
  )
}
