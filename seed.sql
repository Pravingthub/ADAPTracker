-- Run AFTER schema.sql, and after you have signed in once so your user exists.
-- Change the email below to yours.

with ws as (
  insert into workspaces (name, target, weeks)
  values ('ADAP Recovery · ELA SS + AM1', 265170, 13)
  returning id
),
me as (
  select id from auth.users where email = 'you@example.com' limit 1
),
mem as (
  insert into workspace_members (workspace_id, user_id, role)
  select ws.id, me.id, 'owner' from ws, me
  returning workspace_id
)
insert into milestones (workspace_id, ord, phase, title)
select mem.workspace_id, v.ord, v.phase, v.title
from mem, (values
  (1,'Days 1–10 · Set up','Every open ADAP deal classified and owned, dead pipeline closed'),
  (2,'Days 1–10 · Set up','ELA and ADMP no-ADAP lists built, ranked and split by owner'),
  (3,'Days 1–10 · Set up','First weekly deal room held'),
  (4,'Days 11–30 · Start the motions','Outreach started on the top 100 named accounts'),
  (5,'Days 11–30 · Start the motions','Support routing live — first flag reaches an owner and becomes an opportunity'),
  (6,'Days 11–30 · Start the motions','Every ADAP deal lost above $10K reviewed for reopening'),
  (7,'Day 90 · Hand over','Cadence running without me — the team reports the four numbers')
) as v(ord, phase, title);

-- Add a teammate later, once they have signed in once:
-- insert into workspace_members (workspace_id, user_id, role)
-- select w.id, u.id, 'member'
-- from workspaces w, auth.users u
-- where w.name like 'ADAP Recovery%' and u.email = 'teammate@example.com';
