-- ============================================================
-- Activity log: records every change to a task from now on —
-- who made it (their sign-in email), what they did, and when.
-- Run once in Supabase → SQL Editor. Safe to run again.
-- (Changes from the SQL Editor or the monthly reset show as "system".)
-- ============================================================

create table if not exists public.task_activity (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  by_email  text,                       -- who made the change
  action    text not null,              -- added / edited / deleted
  task_id   text not null,
  owner     text,                       -- whose task it is
  title     text,
  changed   text[]                      -- which fields changed (edits only)
);
create index if not exists task_activity_at_idx on public.task_activity (at);

create or replace function public.log_task_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  who text := coalesce(nullif(auth.jwt() ->> 'email', ''), 'system');
  diff text[];
begin
  if tg_op = 'INSERT' then
    insert into task_activity (by_email, action, task_id, owner, title) values (who, 'added', new.id, new.owner, new.title);
    return new;
  elsif tg_op = 'DELETE' then
    insert into task_activity (by_email, action, task_id, owner, title) values (who, 'deleted', old.id, old.owner, old.title);
    return old;
  end if;
  select array_agg(n.key order by n.key) into diff
  from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key)
  where n.value is distinct from o.value and n.key not in ('updated_at');
  if diff is not null then
    insert into task_activity (by_email, action, task_id, owner, title, changed) values (who, 'edited', new.id, new.owner, new.title, diff);
  end if;
  return new;
end $$;

drop trigger if exists tasks_activity on public.tasks;
create trigger tasks_activity after insert or update or delete on public.tasks
  for each row execute function public.log_task_activity();

-- the team can read the log; only the trigger writes to it
alter table public.task_activity enable row level security;
grant select on public.task_activity to authenticated;
drop policy if exists "team reads activity" on public.task_activity;
create policy "team reads activity" on public.task_activity for select to authenticated using (public.is_team());

-- when tracking started
select now() as tracking_started;
