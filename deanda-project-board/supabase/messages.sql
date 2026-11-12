-- ============================================================
-- Messages: short notes between teammates, shown on My Work.
-- Run once in Supabase → SQL Editor (after schema.sql). Safe to
-- run again.
--
--   · each person keeps only their latest 10 messages
--   · messages are cleared when the month changes (New York time),
--     checked every hour
--   · only signed-in @deanda.capital accounts can read or send
--   · new messages are pushed live to everyone with the board open
-- ============================================================

create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  to_name    text not null references public.team_members (name) on update cascade on delete cascade,
  from_name  text not null,
  body       text not null check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists messages_to_idx on public.messages (to_name, created_at desc);

-- keep only the latest 10 for whoever just got a message
create or replace function public.keep_latest_messages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from messages
  where to_name = new.to_name
    and id not in (select id from messages where to_name = new.to_name order by created_at desc, id desc limit 10);
  return null;
end $$;

drop trigger if exists messages_keep_latest on public.messages;
create trigger messages_keep_latest after insert on public.messages
  for each row execute function public.keep_latest_messages();

-- clear last month's messages (runs hourly; the first run after midnight on the 1st does it)
create or replace function public.clear_old_messages() returns void
language sql security definer set search_path = public as $$
  delete from messages
  where created_at < (date_trunc('month', now() at time zone 'America/New_York') at time zone 'America/New_York')
$$;
revoke execute on function public.clear_old_messages() from public, anon, authenticated;
select cron.schedule('clear-old-messages', '9 * * * *', 'select public.clear_old_messages()');

-- the team can read, send and mark as read
alter table public.messages enable row level security;
grant select, insert, update on public.messages to authenticated;
drop policy if exists "team reads messages" on public.messages;
drop policy if exists "team sends messages" on public.messages;
drop policy if exists "team marks messages read" on public.messages;
create policy "team reads messages" on public.messages for select to authenticated using (public.is_team());
create policy "team sends messages" on public.messages for insert to authenticated with check (public.is_team());
create policy "team marks messages read" on public.messages for update to authenticated using (public.is_team()) with check (public.is_team());

-- live updates
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
