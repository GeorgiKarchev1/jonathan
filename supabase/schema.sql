-- ============================================================
-- Atlas — Supabase schema
-- Run this in the Supabase SQL editor to provision the backend.
-- The app stays in local/demo mode until NEXT_PUBLIC_SUPABASE_*
-- env vars are set; then point the data layer at these tables.
-- ============================================================

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'member',     -- owner | admin | member
  color text not null default '#8b5cf6',
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  contact_name text,
  contact_email text,
  website text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  company_id uuid references public.companies(id) on delete set null,
  status text not null default 'planning', -- planning | active | on_hold | done
  color text not null default '#8b5cf6',
  owner_id uuid references public.profiles(id),
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- Who worked on a project
create table if not exists public.project_members (
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member',
  primary key (project_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo',      -- todo | in_progress | review | done
  priority text not null default 'medium',  -- low | medium | high | urgent
  assignee_id uuid references public.profiles(id),
  due_date date,
  "order" double precision not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Logged work periods: who worked, when, how long
create table if not exists public.time_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references public.profiles(id),
  start_date date not null,
  end_date date,
  hours numeric,
  note text
);

-- Folders organise files per client / project (a simple file system tree)
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_id uuid references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Images / files / notes / links per client, project, task & folder
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  kind text not null default 'file',        -- image | file | note | link
  name text not null,
  url text,                                  -- storage path or external link
  body text,                                 -- for notes
  mime text,
  size bigint,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- AI agents the user can create & manage, optionally scoped to a client/project
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  instructions text,                         -- system prompt / persona
  model text not null default 'Claude Opus 4.8',
  color text not null default '#8b5cf6',
  skills text[] not null default '{}',
  company_id uuid references public.companies(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  status text not null default 'active',     -- active | paused
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Нов чат',
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  role text not null,                        -- user | assistant
  content text not null,
  action jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security — every signed-in member can read/write
-- team data. Tighten per-org once you add organizations.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.time_logs enable row level security;
alter table public.folders enable row level security;
alter table public.attachments enable row level security;
alter table public.agents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','companies','projects','project_members',
    'tasks','time_logs','folders','attachments','agents','conversations','messages'
  ]
  loop
    execute format('drop policy if exists "auth read %1$s" on public.%1$I;', t);
    execute format('drop policy if exists "auth write %1$s" on public.%1$I;', t);
    execute format('create policy "auth read %1$s" on public.%1$I for select to authenticated using (true);', t);
    execute format('create policy "auth write %1$s" on public.%1$I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Create a profile row automatically on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket for attachments (run once):
-- insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true);
