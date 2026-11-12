-- ============================================================
-- Sync from the live Project_Board_Nov_2026 Google Sheet (Grace's Nov 11 updates)
--
-- Run once in Supabase → SQL Editor (if it warns about RLS, choose
-- "Run without RLS": the two tables it creates are temporary). It:
--   · edits 7 tasks that changed in the sheet, but only if nobody has
--     edited that task in the app since; those are counted as "skipped"
--   · adds 12 new tasks, unless someone already entered the same task
--     in the app
--   · deletes nothing
-- Safe to run twice: the second run changes nothing.
-- ============================================================
begin;

create temp table sheet_changes (
  id text primary key,
  title text, pillar text, workstream text, priority text, status text, due date, completed date, hours numeric, notes text,
  old_title text, old_pillar text, old_workstream text, old_priority text, old_status text, old_due date, old_completed date, old_hours numeric, old_notes text
) on commit drop;
insert into sheet_changes values
  ('t76', 'Send David Madrid the Marathon underwriting model & Marathon Package (pull from build)', 'PMC', 'Marathon Management', 'P0', 'Done', '2026-11-04', '2026-11-11', 3.5, 'Draft email to David sent to Henry/Hamza for review 2:42pm 11/11; still not sent to David', 'Send David Madrid the Marathon underwriting model & Marathon Package (pull from build)', 'PMC', 'Marathon Management', 'P0', 'In progress', '2026-11-04', null, 3.0, 'Hamza confirmed the IRR explanation is sound; to mention 2 other acquisition opportunities (~4x, ~5-6x) to Pinnacle when sending. Not yet sent as of 3:34pm call'),
  ('t82', 'Mid-month Budget Review', 'dAC Internal', 'Operations', 'P0', 'Done', '2026-11-10', '2026-11-10', 2.0, null, 'Mid-month Budget Review', 'dAC Internal', 'Operations', 'P0', 'In progress', null, null, null, null),
  ('t85', 'Doorcount SEO optimization', 'de Anda LABs', 'Doorcount Website', 'P1', 'Done', '2026-11-13', '2026-11-11', 0.5, 'Doorcount SEO Plan doc sent to Isabel 11:25am 11/11 (6-step plan starting with the www redirect fix)', 'Doorcount SEO optimization', 'de Anda LABs', 'Doorcount Website', 'P1', 'Not started', '2026-11-13', null, null, 'Grace to share SEO list with a teammate and start this week per today''s call'),
  ('s384492649c57', 'Follow up with Hamza and Henry for their hours (P&L attribution)', 'dAC Internal', 'Operations', 'P1', 'Done', '2026-11-13', '2026-11-11', 0.5, 'Hamza committed in 11/11 2:41pm call to send his Nov utilization hours today', 'Follow up with Hamza and Henry for their hours (P&L attribution)', 'dAC Internal', 'Operations', 'P1', 'Not started', '2026-11-13', null, null, 'Needed for the de Anda Capital P&L / Michael presentation Fri 11/13; Henry''s time = overhead, Hamza = PMC-attributable per today''s call'),
  ('scda03798c871', 'Make updates to the de Anda Capital ("DNL") website', 'de Anda LABs', 'de Anda Capital Website', 'P2', 'Done', '2026-11-13', '2026-11-11', 1.0, 'Per today''s call (~3:34pm); confirm which site this refers to', 'Make updates to the de Anda Capital ("DNL") website', 'de Anda LABs', 'de Anda Capital Website', 'P2', 'Not started', '2026-11-13', null, null, 'Per today''s call (~3:34pm); confirm which site this refers to'),
  ('sfb5140ec2312', 'Process PKFOD Invoice #1118745 (Project Run)', 'dAC Internal', 'Operations', 'P1', 'Done', '2026-11-11', '2026-11-11', 0.25, 'Forwarded by Hamza 6:12pm today', 'Process PKFOD Invoice #1118745 (Project Run)', 'dAC Internal', 'Operations', 'P1', 'Not started', null, null, null, 'Forwarded by Hamza 6:12pm today'),
  ('t81', 'Lead onboarding/PM work with Connor Krolls (new intern) and Luis', 'dAC Internal', 'Recruiting', 'P2', 'Done', '2026-11-13', '2026-11-13', 0.5, 'From Mainspring Payroll Wedge transcript, 10:16am; Grace taking point with new intern Connor', 'Lead onboarding/PM work with Connor Krolls (new intern)', 'dAC Internal', 'Recruiting', 'P2', 'In progress', null, null, 0.25, 'From Mainspring Payroll Wedge transcript, 10:16am; Grace taking point with new intern Connor');

create temp table sheet_new (
  id text primary key, owner text, title text, pillar text, workstream text, priority text, status text, due date, completed date, hours numeric, notes text
) on commit drop;
insert into sheet_new values
  ('s5d5c59a46c6d', 'Grace', 'Daily Check-In (Payroll Keep-or-Exit Review)', 'dAC Internal', 'Operations', 'P1', 'Done', '2026-11-11', '2026-11-11', 1.0, '10:25-11:18am recorded call (BuildBetter); walked the board; Mainspring payroll/TNA keep-or-exit deep dive; PMC now 3 consolidation targets'),
  ('s864ff2cd871f', 'Grace', 'CPA Candidate Interview: Grace Hull', 'dAC Internal', 'Recruiting', 'P1', 'Done', '2026-11-11', '2026-11-11', 0.5, '11:07-11:41am recorded call (BuildBetter); scorecard sent to Henry/Hamza/Isabel 11:24am'),
  ('sc43c4da811dd', 'Grace', 'Grace / Luis: Project Board website mockup review', 'de Anda LABs', 'de Anda LABs', 'P1', 'Done', '2026-11-11', '2026-11-11', 1.0, '12:30-1:30pm calendar event, no recording found; reviewed revised mockup / PM agent v1 update'),
  ('s4a7a15230459', 'Grace', 'Michael Prep & Deliverables', 'dAC Internal', 'Operations', 'P0', 'Done', '2026-11-11', '2026-11-11', 0.75, '2:41-3:20pm recorded call (BuildBetter); aligned EOD deliverables for Thu/Fri Michael de Anda meetings'),
  ('s291b1170cac7', 'Grace', 'Pull Henry''s Mercury card charges for Oct/Nov tagging', 'dAC Internal', 'Operations', 'P2', 'Done', '2026-11-11', '2026-11-11', 1.0, 'Email to Henry 2:27pm with Henry Card Review sheet (cards ••8707, ••7582)'),
  ('sef183a6a2cbf', 'Grace', 'Confirm Radiant mNDAs sent (Marcela''s party)', 'EdgeFlo', 'Other', 'P2', 'Done', '2026-11-11', '2026-11-11', 0.25, 'Reply to Hamza/Brayden 9:49am confirming both mNDAs sent'),
  ('s91ebe56e51fd', 'Grace', 'Set up Sree Akkineni''s de Anda email + Claude access; confirm Friday working session', 'dAC Internal', 'Recruiting', 'P2', 'Done', '2026-11-11', '2026-11-11', 0.5, 'Replied to Sree 7:14pm; Isabel provisioned sree@deanda.capital 8:37pm; Fri 11/13 11am-12pm session now on calendar'),
  ('s96afd709fac3', 'Grace', 'Run formal PMC consolidation deep-integration exercise (Marathon, Mid South, CB Properties)', 'PMC', 'Asset Management', 'P0', 'Not started', null, null, null, 'From 10:25am Daily Check-in transcript; Hamza: "we need to run that formally" now that there are 3 targets'),
  ('s20c872892677', 'Grace', 'Prepare QoE workbook walkthrough for Michael de Anda (Thu PMC session)', 'PMC', 'Marathon Management', 'P0', 'Not started', '2026-11-12', null, null, 'From 2:48pm Michael Prep call; Hamza asked for a walkthrough showing where the money went and how the go-forward approach differs'),
  ('s9fd9116ea9b9', 'Grace', 'Send Grace Hull the take-home QoE case study assignment', 'dAC Internal', 'Recruiting', 'P1', 'Not started', '2026-11-12', null, null, 'From 11:38am interview close; not yet sent; candidate wants to decide by Friday'),
  ('s2374ee2f49dd', 'Grace', 'Reply to Mark Henderson''s QoE assessment check-in email', 'dAC Internal', 'Recruiting', 'P1', 'Not started', null, null, null, 'He asked if any questions came up on the Cedar Hollow workbook/memo, offered a call'),
  ('se0642557c837', 'Grace', 'Draft email to David Madrid', 'PMC', 'Marathon Management', 'P0', 'Blocked', '2026-11-13', '2026-11-13', 0.25, 'waiting for Henry & Hamza''s approaval');

with edited as (
  update public.tasks t
  set title = s.title, pillar = s.pillar, workstream = s.workstream, priority = s.priority, status = s.status,
      due = s.due, completed = s.completed, hours = s.hours, notes = s.notes
  from sheet_changes s
  where t.id = s.id
    and (t.title, t.pillar, t.workstream, t.priority, t.status, t.due, t.completed, t.hours, t.notes)
        is not distinct from (s.old_title, s.old_pillar, s.old_workstream, s.old_priority, s.old_status, s.old_due, s.old_completed, s.old_hours, s.old_notes)
  returning t.id
),
added as (
  insert into public.tasks (id, owner, title, pillar, workstream, priority, status, due, completed, hours, notes)
  select n.id, n.owner, n.title, n.pillar, n.workstream, n.priority, n.status, n.due, n.completed, n.hours, n.notes
  from sheet_new n
  -- skip it if someone already typed the same task into the app
  where not exists (
    select 1 from public.tasks t
    where t.id !~ '^[ts][0-9a-f]{1,12}$'
      and t.owner = n.owner and lower(btrim(t.title)) = lower(btrim(n.title))
      and (t.due is not distinct from n.due or t.due is null or n.due is null)
  )
  on conflict (id) do nothing
  returning id
)
select
  (select count(*) from edited) as tasks_edited,
  (select count(*) from sheet_changes) - (select count(*) from edited) as edits_skipped,
  (select count(*) from added) as tasks_added,
  (select count(*) from sheet_new) - (select count(*) from added) as adds_skipped;

commit;
