import { createClient } from '@supabase/supabase-js'

/* The Supabase client, or null when the env vars aren't set: the app then
   runs on the bundled spreadsheet data in this browser only, as before. */
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } }) : null

/** Only accounts on the company Google Workspace get in (the database checks this too). */
export const TEAM_DOMAIN = 'deanda.capital'
