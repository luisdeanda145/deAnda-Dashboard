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
| **Overview** | Overview tab: team summary, story points done %, open items, status mix, pillar load, daily hours |
| **My Work** | A personal tab: Open tasks, Done this month, Est. hours still open, Real hours this month, plus the to-do list grouped by due date. Switch person from the pill at the top. |
| **Board** | Kanban by status. Drag a card to change its status. Dropping on Done stamps today's Completed Date and asks for real hours. |
| **All Tasks** | The ToDo Feed: every row from every tab, sortable, searchable, filterable, exportable to CSV |
| **Pillars** | Each pillar tab, its By Workstream breakdown and open work |
| **Team** | By Person: hours, completion, blocked, and how real hours compare with estimates |
| **Hours** | Daily Hours Tracker as a heat map, plus hours by pillar |
| **Compare** | Month over month: pick any two months and compare hours logged, tasks completed and due, on-time rate, and the By Person / By Pillar breakdowns, plus a six-month hours trend. Work is credited by Completed Date and Due Date, so earlier months fill in as the board accumulates history. |
| **Insights** | Estimate vs actual, due-date health, priority mix, and data hygiene (rows the sheet's formulas can't count) |
| **Settings** | Reporting month; add or remove team members, pillars and workstreams; glass and spatial controls |
| **How It Works** | The sheet's rules for the team |

Add team members from **Team** or **Settings**, and pillars and workstreams from **Pillars** or **Settings**. A person, pillar or workstream can only be removed once no task points at it. These edits are saved in the browser (`src/lib/directory.js`) until the backend is connected.

Click any task anywhere to edit every column of its row. `N` adds a task, `⌘K` searches tasks, people and pillars.

## Connecting the backend

All reads and writes go through **`src/lib/api.js`** (`fetchTasks`, `createTask`, `updateTask`, `deleteTask`). Set `VITE_API_URL` and fill in the commented `fetch` calls. The UI already updates optimistically, so nothing else needs to change. The task row shape is documented at the top of that file.

| What | Where |
| --- | --- |
| Signed-in user | `USER` in `src/data/board.js` |
| Default team, statuses, priorities, pillars, workstreams (the Lists tab) | `src/data/board.js` |
| Team, pillars and workstreams as edited in the app | `src/lib/directory.js` (localStorage today) |
| Reporting month | `BOARD_MONTH` in `src/data/board.js` (also changeable in Settings) |
| The sheet's formulas (summary, by person, by pillar, by workstream, daily hours) | `src/lib/selectors.js` |
| Imported tasks (538 rows from the personal tabs) | `src/data/tasks.json` |
| Background photo | `public/background.jpg` |
| New styles for this board | `src/styles/board.css` (the v8 system is untouched in `base.css`, `space.css`, `overview.css`, `pages.css`) |

## Notes on the import

- Rows come from the seven personal tabs (rows 14 and below), which is what the ToDo Feed stacks.
- Text dates such as `10-Nov-26` were converted to ISO dates. `TBD` became no date.
- Tasks with no status count as **Not started** (they already counted as open on the sheet). One `done` was normalised to `Done`.
- Team roles under each name are worked out from each person's top pillars, not typed in.
