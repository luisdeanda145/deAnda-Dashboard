/* The one-time team announcement (components/Announcement.jsx).
   Change the id to show a new announcement to everyone once more. */
const ID = 'claude-connect-2026-11'
const KEY = 'dac-announcement-seen'

export const announcementSeen = () => {
  try {
    return localStorage.getItem(KEY) === ID
  } catch {
    return false
  }
}
export const markAnnouncementSeen = () => {
  try {
    localStorage.setItem(KEY, ID)
  } catch {
    /* storage off: it shows again next time, which is fine */
  }
}
