/* sidebar order; `low` items sit in the group pinned to the bottom */
export const PAGES = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'mine', label: 'My Work', icon: 'user' },
  { id: 'board', label: 'Board', icon: 'pipeline' },
  { id: 'tasks', label: 'All Tasks', icon: 'task' },
  { id: 'pillars', label: 'Pillars', icon: 'layers' },
  { id: 'team', label: 'Team', icon: 'users' },
  { id: 'hours', label: 'Hours', icon: 'clock' },
  { id: 'insights', label: 'Insights', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'sliders', low: true },
  { id: 'guide', label: 'How It Works', icon: 'help', low: true },
]
