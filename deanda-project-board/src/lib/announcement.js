/* The one-time team announcement (components/Announcement.jsx).
   Change the id to show a new announcement to everyone once more.
   Who saw it and who held "I understand" is recorded in the database
   (table announcement_reads, supabase/announcement-reads.sql). */
import { connected } from './api'
import { supabase } from './supabase'

export const ID = 'claude-connect-2026-11-b' // "-b": shown once more so everyone gets recorded
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

/** Records that the pop-up was shown to the signed-in person, or that they confirmed it.
    Best effort: the pop-up works the same if this fails. */
export async function recordAnnouncement({ acknowledged = false } = {}) {
  if (!connected) return
  try {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user
    if (!user?.email) return
    const meta = user.user_metadata || {}
    const row = { announcement: ID, email: user.email.toLowerCase(), name: meta.full_name || meta.name || null }
    if (acknowledged) row.acknowledged_at = new Date().toISOString()
    /* first sighting: insert once, keep the original time; confirmation: fill in acknowledged_at */
    await supabase.from('announcement_reads').upsert(row, { onConflict: 'announcement,email', ignoreDuplicates: !acknowledged })
  } catch {
    /* not recorded; nothing else depends on it */
  }
}
