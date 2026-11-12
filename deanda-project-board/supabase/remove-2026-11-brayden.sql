-- ============================================================
-- Removes the 7 tasks that are no longer on Brayden's tab in
-- Project_Board_Nov_2026.xlsx. Run once in Supabase → SQL Editor.
-- Only these exact tasks are touched; running it twice does nothing.
-- ============================================================
delete from public.tasks
where owner = 'Brayden'
  and id in ('t145', 't146', 't147', 't148', 't149', 't165', 't175')
returning id, title;
