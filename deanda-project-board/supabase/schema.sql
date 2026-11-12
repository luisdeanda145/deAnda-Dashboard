-- ============================================================
-- de Anda Capital · Project Board — database setup
--
-- Run once in Supabase → SQL Editor (paste all of it, Run).
-- Safe to run again: it only creates what's missing and
-- replaces the functions.
--
-- What it sets up
--   team_members, pillars, workstreams   the Lists tab
--   tasks                                every row on the board
--   months                               one row of totals per closed month (Insights)
--   is_team()                            only signed-in @deanda.capital accounts get in
--   close_month / close_ended_months     the monthly reset, run by pg_cron every hour
--   realtime on tasks                    edits show up for everyone straight away
--
-- Month boundaries follow New York time (America/New_York).
-- ============================================================

create extension if not exists pg_cron with schema pg_catalog;

-- ---------------- the Lists tab ----------------
create table if not exists public.team_members (
  name       text primary key,
  role       text,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pillars (
  name  text primary key,
  code  text not null,
  tone  text not null default 'blue',
  blurb text not null default '',
  sort  int not null default 0
);

create table if not exists public.workstreams (
  name   text not null,
  pillar text not null references public.pillars (name) on update cascade on delete cascade,
  sort   int not null default 0,
  primary key (pillar, name)
);

-- ---------------- tasks ----------------
-- One row of a personal tab. `pillar` is free text because the
-- to-do-only pillars (Personal / Admin, Other…) aren't pillar tabs.
create table if not exists public.tasks (
  id         text primary key default ('t' || replace(gen_random_uuid()::text, '-', '')),
  owner      text not null references public.team_members (name) on update cascade,
  title      text not null check (length(btrim(title)) > 0),
  pillar     text,
  workstream text,
  priority   text check (priority in ('P0', 'P1', 'P2', 'P3')),
  status     text not null default 'Not started' check (status in ('Not started', 'In progress', 'Blocked', 'Done')),
  due        date,
  completed  date,
  points     numeric check (points >= 0),   -- story points: effort, not time
  hours      numeric check (hours >= 0),    -- hours worked
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_owner_idx on public.tasks (owner);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_completed_idx on public.tasks (completed);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ---------------- closed months (Insights) ----------------
-- No task rows: only what Insights compares. Shape in src/lib/api.js.
create table if not exists public.months (
  month     text primary key check (month ~ '^\d{4}-\d{2}$'),
  closed_at timestamptz not null default now(),
  summary   jsonb not null,   -- the board at month end
  stats     jsonb not null    -- totals, by person and by pillar
);

-- The first month the board ran, so the reset never "closes" months before it.
create table if not exists public.board_meta (
  key   text primary key,
  value text not null
);
insert into public.board_meta (key, value)
values ('first_month', to_char(now() at time zone 'America/New_York', 'YYYY-MM'))
on conflict (key) do nothing;

-- ---------------- who gets in ----------------
-- Signed in with a @deanda.capital account. (Google sign-in is also set to
-- "Internal", so this is a second lock on the same door.)
create or replace function public.is_team() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'email') ilike '%@deanda.capital', false)
$$;

alter table public.team_members enable row level security;
alter table public.pillars      enable row level security;
alter table public.workstreams  enable row level security;
alter table public.tasks        enable row level security;
alter table public.months       enable row level security;
alter table public.board_meta   enable row level security;   -- no policies: server only

do $$
declare t text;
begin
  -- the team can read and change the board and its lists
  foreach t in array array['team_members', 'pillars', 'workstreams', 'tasks'] loop
    execute format('drop policy if exists "team reads %1$s" on public.%1$I', t);
    execute format('drop policy if exists "team writes %1$s" on public.%1$I', t);
    execute format('create policy "team reads %1$s" on public.%1$I for select to authenticated using (public.is_team())', t);
    execute format('create policy "team writes %1$s" on public.%1$I for all to authenticated using (public.is_team()) with check (public.is_team())', t);
  end loop;
  -- closed months are read-only: only the monthly job writes them
  drop policy if exists "team reads months" on public.months;
  create policy "team reads months" on public.months for select to authenticated using (public.is_team());
end $$;

-- ---------------- the monthly reset ----------------
-- close_month('2026-11'):
--   1. saves the month's totals in `months` (from its board: open work plus
--      work completed that month)
--   2. deletes the month's completed tasks; open tasks carry over
-- Does nothing if the month is already closed.
create or replace function public.close_month(ym text) returns void
language plpgsql security definer set search_path = public as $$
declare
  m_start date := to_date(ym || '-01', 'YYYY-MM-DD');
  m_next  date := (to_date(ym || '-01', 'YYYY-MM-DD') + interval '1 month')::date;
  v_summary jsonb;
  v_stats   jsonb;
begin
  if exists (select 1 from months where month = ym) then
    return;
  end if;

  with board as (
    -- the month's board as it stood: open work, work completed this month,
    -- and done rows without a completed date, placed by their due date
    select * from tasks t
    where t.status <> 'Done'
       or (t.completed >= m_start and t.completed < m_next)
       or (t.completed is null and (t.due is null or t.due >= m_start))
  ),
  done as (
    select * from board where status = 'Done' and completed >= m_start and completed < m_next
  ),
  due as (
    select * from board where due >= m_start and due < m_next
  ),
  due_done as (
    select * from due where status = 'Done' and completed is not null
  ),
  paced as (
    select * from done where points > 0 and hours is not null
  )
  select
    jsonb_build_object(
      'tasks',         (select count(*) from board),
      'open',          (select count(*) from board where status <> 'Done'),
      'closed',        (select count(*) from board where status = 'Done'),
      'inProgress',    (select count(*) from board where status = 'In progress'),
      'notStarted',    (select count(*) from board where status = 'Not started'),
      'blocked',       (select count(*) from board where status = 'Blocked'),
      'pointsPlanned', (select coalesce(sum(points), 0) from board),
      'pointsDone',    (select coalesce(sum(points), 0) from board where status = 'Done')
    ),
    jsonb_build_object(
      'ym',       ym,
      'done',     (select count(*) from done),
      'hours',    (select coalesce(sum(hours), 0) from done),
      'ptsDone',  (select coalesce(sum(points), 0) from done),
      'hrsPerPt', (select case when sum(points) > 0 then sum(hours) / sum(points) end from paced),
      'due',      (select count(*) from due),
      'duePts',   (select coalesce(sum(points), 0) from due),
      'onTime',   (select case when count(*) > 0 then 100.0 * count(*) filter (where completed <= due) / count(*) end from due_done),
      'people',   (select count(distinct owner) from done),
      'hoursByPerson', (select coalesce(jsonb_object_agg(owner, h), '{}') from (select owner, coalesce(sum(hours), 0) h from done group by owner) x),
      'doneByPerson',  (select coalesce(jsonb_object_agg(owner, n), '{}') from (select owner, count(*) n from done group by owner) x),
      'hoursByPillar', (select coalesce(jsonb_object_agg(pillar, h), '{}') from (select pillar, coalesce(sum(hours), 0) h from done where pillar is not null group by pillar) x),
      'doneByPillar',  (select coalesce(jsonb_object_agg(pillar, n), '{}') from (select pillar, count(*) n from done where pillar is not null group by pillar) x),
      'empty',    (select count(*) = 0 from done) and (select count(*) = 0 from due)
    )
  into v_summary, v_stats;

  insert into months (month, summary, stats) values (ym, v_summary, v_stats);

  -- the new month starts clean: completed work from this month (or earlier) goes
  delete from tasks
  where status = 'Done'
    and ((completed is not null and completed < m_next)
      or (completed is null and due is not null and due < m_next));
end $$;

-- Closes every month that has ended and isn't closed yet (normally just last
-- month). Runs every hour, so the reset happens within the first hour of the
-- 1st, New York time, and catches up if a run is ever missed.
create or replace function public.close_ended_months() returns void
language plpgsql security definer set search_path = public as $$
declare
  cur  text := to_char(now() at time zone 'America/New_York', 'YYYY-MM');
  ym   text;
begin
  -- start after the last closed month, or at the board's first month
  select to_char(to_date(max(month) || '-01', 'YYYY-MM-DD') + interval '1 month', 'YYYY-MM') into ym from months;
  ym := coalesce(ym, (select value from board_meta where key = 'first_month'), cur);
  while ym < cur loop
    perform close_month(ym);
    ym := to_char(to_date(ym || '-01', 'YYYY-MM-DD') + interval '1 month', 'YYYY-MM');
  end loop;
end $$;

-- only the scheduled job may run these
revoke execute on function public.close_month(text) from public, anon, authenticated;
revoke execute on function public.close_ended_months() from public, anon, authenticated;

select cron.schedule('close-ended-months', '7 * * * *', 'select public.close_ended_months()');

-- ---------------- realtime ----------------
-- Task edits are pushed to everyone who has the board open.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks') then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;
