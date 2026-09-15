-- ADAP Recovery Tracker — schema
-- Run once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ───────────────────────────  workspaces  ───────────────────────────
create table if not exists workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  target      numeric not null default 265170,
  weeks       int    not null default 13,
  created_at  timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  role         text not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- ───────────────────────────  milestones  ───────────────────────────
create table if not exists milestones (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  ord          int  not null default 0,
  phase        text not null,
  title        text not null,
  dri          text default '',
  due          date,
  status       text not null default 'todo',
  findings     text default '',
  progress     text default '',
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id)
);
create index if not exists milestones_ws on milestones(workspace_id, ord);

-- ───────────────────────────  weekly log  ───────────────────────────
create table if not exists weeks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  week_ending  date not null,
  motions      jsonb not null default '{}'::jsonb,
  habits       jsonb not null default '{}'::jsonb,
  note         text default '',
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id),
  unique (workspace_id, week_ending)
);
create index if not exists weeks_ws on weeks(workspace_id, week_ending desc);

-- ───────────────────────────  timestamps  ───────────────────────────
create or replace function touch_row() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end $$;

drop trigger if exists t_milestones on milestones;
create trigger t_milestones before insert or update on milestones
  for each row execute function touch_row();

drop trigger if exists t_weeks on weeks;
create trigger t_weeks before insert or update on weeks
  for each row execute function touch_row();

-- ───────────────────────────  row level security  ───────────────────
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;
alter table milestones        enable row level security;
alter table weeks             enable row level security;

create or replace function is_member(ws uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

drop policy if exists ws_read  on workspaces;
drop policy if exists mem_read on workspace_members;
drop policy if exists ms_all   on milestones;
drop policy if exists wk_all   on weeks;

create policy ws_read  on workspaces        for select using (is_member(id));
create policy mem_read on workspace_members for select using (is_member(workspace_id));
create policy ms_all   on milestones        for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy wk_all   on weeks             for all using (is_member(workspace_id)) with check (is_member(workspace_id));
