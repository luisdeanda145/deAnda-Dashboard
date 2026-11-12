-- ============================================================
-- Who updated the board, and how much. Run in Supabase → SQL Editor.
-- Change the interval to look further back.
-- ============================================================

-- per person
select by_email as who,
       count(*) filter (where action = 'added')   as tasks_added,
       count(*) filter (where action = 'edited')  as edits,
       count(*) filter (where action = 'deleted') as tasks_deleted,
       count(distinct task_id)                    as tasks_touched,
       min(at at time zone 'America/New_York')    as first_change_et,
       max(at at time zone 'America/New_York')    as last_change_et
from public.task_activity
where at > now() - interval '1 day'
  and by_email <> 'system'
group by by_email
order by count(*) desc;

-- the details, newest first (run on its own if you want them)
-- select at at time zone 'America/New_York' as at_et, by_email, action, owner, title, changed
-- from public.task_activity where at > now() - interval '1 day' order by at desc;
