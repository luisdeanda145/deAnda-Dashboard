# de Anda Capital — Project Board

The team's project board as a spatial glass dashboard, built on Glassy Dashboard v8 (React + Vite, no UI library). It reads the same data as `Project_Board_Nov_2026.xlsx` and reports the same numbers the Overview tab's formulas do.

## Quick start

Requires **Node.js 20.19+ or 22.12+**.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

## Pages

| Page | What it is in the spreadsheet |
| --- | --- |
| **Overview** | Overview tab: story points done %, open items, status mix, pillar load (all tasks this month), the Daily Hours Tracker (person × day) and Where The Hours Went (hours by pillar) |
| **My Work** | A personal tab: Open tasks, Done this month, Story points still open, Hours this month, plus the to-do list by week and by day: open work by Due Date runs forward from today (Today, Overdue most recent first and folded when long, the rest of this week, next week, later weeks, no date); completed work by Completed Date runs back from today (Today, earlier this week, last week, older weeks). Switch person from the pill at the top. |
| **Board** | Kanban by status. Drag a card to change its status. Dropping on Done stamps today's Completed Date and asks for the hours it took. |
| **All Tasks** | The ToDo Feed: every row from every tab, sortable, searchable, filterable, exportable to CSV |
| **Pillars** | Each pillar tab, its By Workstream breakdown and all its tasks in one timeline: Today, Overdue, the weeks ahead, then the weeks behind (where completed work sits) |
| **Team** | By Person: hours, story points, completion, blocked, and hours per story point |
| **Insights** | Month over month: pick any two months and compare hours logged, tasks completed and due, on-time rate, and the By Person / By Pillar breakdowns, plus a six-month hours trend. Work is credited by Completed Date and Due Date, so earlier months fill in as the board accumulates history. |
| **Settings** | The current month and archived months; add or remove team members, pillars and workstreams; glass and spatial controls |
| **How It Works** | The sheet's rules for the team |

Add team members from **Team** or **Settings**, and pillars and workstreams from **Pillars** or **Settings**. A person, pillar or workstream can only be removed once no task points at it. These edits are saved in the browser (`src/lib/directory.js`) until the backend is connected.

Each task has **Story points** (effort: 1, 2, 3, 5, 8, 13) and **Hours** (time it actually took). Hours count toward Hours Logged once the task is Done with a Completed Date. Every task shows its due date, and once Done its completed date too; labels always carry the date ("Today · Nov 11", "Fri, Nov 13", "2d late · Nov 9"). Completed tasks carry a teal edge and a Completed badge everywhere. All Tasks, sorted by Date, breaks into a heading row per day.

Everything date-based is worked out from today's date each time the page draws, so sections, week ranges and the reporting month move on by themselves, including at midnight with the page left open. Dates outside the current year show their year ("Nov 3, 2025").

**Monthly boards.** Every page except Insights shows only the current month's board: work completed this month plus everything still open (open work carries over, as on the monthly sheets). The sidebar shows the month, the day and when it resets. On the 1st, the month that ended is archived (its tasks, summary and totals) and Insights reads closed months from the archive. A month that ends while nobody has the app open is closed on the next visit.

Click any task anywhere to edit every column of its row. `N` adds a task, `⌘K` searches tasks, people and pillars.

## Connecting the backend

All reads and writes go through **`src/lib/api.js`** (`fetchTasks`, `createTask`, `updateTask`, `deleteTask`). Set `VITE_API_URL` and fill in the commented `fetch` calls. The UI already updates optimistically, so nothing else needs to change. The task row shape is documented at the top of that file.

| What | Where |
| --- | --- |
| Signed-in user | `USER` in `src/data/board.js` |
| Default team, statuses, priorities, pillars, workstreams (the Lists tab) | `src/data/board.js` |
| Team, pillars and workstreams as edited in the app | `src/lib/directory.js` (localStorage today) |
| Reporting month, month close and archive | The board is always the current calendar month (`month` in `src/App.jsx`). On the 1st the month that ended is archived through `archiveMonth` / `fetchArchive` in `src/lib/api.js` (kept in this browser until the backend exists); the board rules are `onBoard` / `closeMonth` in `src/lib/selectors.js`. |
| The sheet's formulas (summary, by person, by pillar, by workstream, daily hours) | `src/lib/selectors.js` |
| Imported tasks (538 rows from the personal tabs) | `src/data/tasks.json` |
| Background photo | `public/background.jpg` |
| New styles for this board | `src/styles/board.css` (the v8 system is untouched in `base.css`, `space.css`, `overview.css`, `pages.css`) |

## Notes on the import

- Rows come from the seven personal tabs (rows 14 and below), which is what the ToDo Feed stacks.
- Text dates such as `10-Nov-26` were converted to ISO dates. `TBD` became no date.
- The sheet's Real Story Points became **Hours**. Its Est. Story Points (an hour estimate) were dropped; **Story points** start empty and are filled in per task.
- Tasks with no status count as **Not started** (they already counted as open on the sheet). One `done` was normalised to `Done`.
- Team roles under each name are worked out from each person's top pillars, not typed in.
