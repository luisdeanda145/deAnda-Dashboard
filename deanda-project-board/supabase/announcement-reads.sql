-- ============================================================
-- Who has seen the team announcement pop-up, and who held "I understand".
-- One row per person per announcement. See it in Table Editor →
-- announcement_reads, or with the query at the bottom.
-- Safe to run again.
-- ============================================================
create table if not exists public.announcement_reads (
  announcement    text not null,                       -- which pop-up (its id in src/lib/announcement.js)
  email           text not null,
  name            text,
  seen_at         timestamptz not null default now(),  -- first time it popped up for them
  acknowledged_at timestamptz,                          -- when they held "I understand"
  primary key (announcement, email)
);

-- each person can only record themselves; nobody can read other people's rows
-- from the dashboard (you read them in Supabase)
alter table public.announcement_reads enable row level security;
grant select, insert, update on public.announcement_reads to authenticated;
drop policy if exists "record own announcement reads" on public.announcement_reads;
drop policy if exists "update own announcement reads" on public.announcement_reads;
drop policy if exists "see own announcement reads" on public.announcement_reads;
create policy "record own announcement reads" on public.announcement_reads for insert to authenticated
  with check (public.is_team() and email = lower(auth.jwt() ->> 'email'));
create policy "update own announcement reads" on public.announcement_reads for update to authenticated
  using (email = lower(auth.jwt() ->> 'email')) with check (email = lower(auth.jwt() ->> 'email'));
create policy "see own announcement reads" on public.announcement_reads for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

-- Everyone on the team and where they stand, per announcement.
-- Open it in Table Editor → announcement_status. Dashboard only: not readable through the app's API.
create or replace view public.announcement_status
with (security_invoker = true) as
select
  a.announcement,
  t.name,
  case
    when r.acknowledged_at is not null then 'Confirmed'
    when r.seen_at is not null then 'Seen, not confirmed'
    else 'Not seen yet'
  end as status,
  r.seen_at,
  r.acknowledged_at
from (select distinct announcement from public.announcement_reads) a
cross join public.team_members t
left join public.announcement_reads r
  on r.announcement = a.announcement
 and lower(split_part(r.email, '@', 1)) = lower(t.name)
order by a.announcement, r.acknowledged_at nulls first, t.name;
revoke all on public.announcement_status from anon, authenticated;

-- To check who has confirmed (run in the SQL Editor):
-- select name, email, seen_at, acknowledged_at from public.announcement_reads
-- where announcement = 'claude-connect-2026-11-b' order by acknowledged_at nulls first;
