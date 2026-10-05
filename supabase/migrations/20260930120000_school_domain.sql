/*
  Persistent school classes, pupils, adventures, sessions, and learning events.
  Organisation already means a school. These tables hang off it.

  Additive only. Does not alter Morris and Son tables, score_bundles, or story jobs.
*/

create or replace function private.can_teach(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.org_role(org) in ('owner', 'school_admin', 'teacher');
$$;

revoke all on function private.can_teach(uuid) from public, anon, authenticated;
grant execute on function private.can_teach(uuid) to authenticated;

create table public.school_classes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  year_label text not null default '',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_pupils (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  class_id uuid not null references public.school_classes (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  presentation text not null default '' check (presentation in ('', 'girl', 'boy')),
  look jsonb not null default '{}'::jsonb,
  seat text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_pupils_look_object check (jsonb_typeof(look) = 'object')
);

create table public.school_adventures (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  class_id uuid references public.school_classes (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  subject text not null default '',
  year_label text not null default '',
  objectives jsonb not null default '[]'::jsonb,
  source_note text not null default '',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  class_id uuid references public.school_classes (id) on delete set null,
  adventure_id uuid references public.school_adventures (id) on delete set null,
  created_by uuid not null references auth.users (id),
  code text not null,
  mode text not null default 'board',
  status text not null default 'playing',
  phase text not null default 'waiting',
  slide_index integer not null default 0,
  selected_pupil_id uuid references public.school_pupils (id) on delete set null,
  reward_total integer not null default 0,
  demo boolean not null default false,
  snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, code)
);

create table public.school_teams (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  session_id uuid not null references public.school_sessions (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  sort_order integer not null default 0,
  points integer not null default 0
);

create table public.school_participants (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  session_id uuid not null references public.school_sessions (id) on delete cascade,
  pupil_id uuid references public.school_pupils (id) on delete set null,
  team_id uuid references public.school_teams (id) on delete set null,
  display_name text not null default '',
  kind text not null default 'pupil' check (kind in ('pupil', 'team', 'class'))
);

create table public.school_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  session_id uuid not null references public.school_sessions (id) on delete cascade,
  class_id uuid references public.school_classes (id) on delete set null,
  adventure_id uuid references public.school_adventures (id) on delete set null,
  scope text not null check (scope in ('class', 'team', 'pupil')),
  team_id uuid references public.school_teams (id) on delete set null,
  pupil_id uuid references public.school_pupils (id) on delete set null,
  mechanic text not null default '',
  result text not null default '',
  points integer not null default 0,
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint school_events_scope_match check (
    (scope = 'class' and pupil_id is null and team_id is null)
    or (scope = 'team' and team_id is not null and pupil_id is null)
    or (scope = 'pupil' and pupil_id is not null)
  )
);

create index school_classes_org_idx on public.school_classes (organisation_id);
create index school_pupils_class_idx on public.school_pupils (class_id);
create index school_pupils_org_idx on public.school_pupils (organisation_id);
create index school_adventures_org_idx on public.school_adventures (organisation_id);
create index school_sessions_org_idx on public.school_sessions (organisation_id);
create index school_sessions_adventure_idx on public.school_sessions (adventure_id);
create index school_teams_session_idx on public.school_teams (session_id);
create index school_participants_session_idx on public.school_participants (session_id);
create index school_events_session_idx on public.school_events (session_id);
create index school_events_pupil_idx on public.school_events (pupil_id);

alter table public.school_classes enable row level security;
alter table public.school_pupils enable row level security;
alter table public.school_adventures enable row level security;
alter table public.school_sessions enable row level security;
alter table public.school_teams enable row level security;
alter table public.school_participants enable row level security;
alter table public.school_events enable row level security;

revoke all on public.school_classes from anon, authenticated;
revoke all on public.school_pupils from anon, authenticated;
revoke all on public.school_adventures from anon, authenticated;
revoke all on public.school_sessions from anon, authenticated;
revoke all on public.school_teams from anon, authenticated;
revoke all on public.school_participants from anon, authenticated;
revoke all on public.school_events from anon, authenticated;

grant select, insert, update, delete on public.school_classes to authenticated;
grant select, insert, update, delete on public.school_pupils to authenticated;
grant select, insert, update, delete on public.school_adventures to authenticated;
grant select, insert, update, delete on public.school_sessions to authenticated;
grant select, insert, update, delete on public.school_teams to authenticated;
grant select, insert, update, delete on public.school_participants to authenticated;
grant select, insert, update, delete on public.school_events to authenticated;

create policy school_classes_read on public.school_classes
  for select to authenticated
  using (private.is_org_member(organisation_id));

create policy school_classes_write on public.school_classes
  for all to authenticated
  using (private.can_teach(organisation_id))
  with check (private.can_teach(organisation_id));

create policy school_pupils_read on public.school_pupils
  for select to authenticated
  using (private.is_org_member(organisation_id));

create policy school_pupils_write on public.school_pupils
  for all to authenticated
  using (private.can_teach(organisation_id))
  with check (
    private.can_teach(organisation_id)
    and organisation_id = (select c.organisation_id from public.school_classes c where c.id = class_id)
  );

create policy school_adventures_read on public.school_adventures
  for select to authenticated
  using (private.is_org_member(organisation_id));

create policy school_adventures_write on public.school_adventures
  for all to authenticated
  using (private.can_teach(organisation_id))
  with check (
    private.can_teach(organisation_id)
    and (
      class_id is null
      or organisation_id = (select c.organisation_id from public.school_classes c where c.id = class_id)
    )
  );

create policy school_sessions_read on public.school_sessions
  for select to authenticated
  using (private.is_org_member(organisation_id));

create policy school_sessions_write on public.school_sessions
  for all to authenticated
  using (private.can_teach(organisation_id))
  with check (
    private.can_teach(organisation_id)
    and (class_id is null or organisation_id = (select c.organisation_id from public.school_classes c where c.id = class_id))
    and (adventure_id is null or organisation_id = (select a.organisation_id from public.school_adventures a where a.id = adventure_id))
  );

create policy school_teams_read on public.school_teams
  for select to authenticated
  using (private.is_org_member(organisation_id));

create policy school_teams_write on public.school_teams
  for all to authenticated
  using (private.can_teach(organisation_id))
  with check (
    private.can_teach(organisation_id)
    and organisation_id = (select s.organisation_id from public.school_sessions s where s.id = session_id)
  );

create policy school_participants_read on public.school_participants
  for select to authenticated
  using (private.is_org_member(organisation_id));

create policy school_participants_write on public.school_participants
  for all to authenticated
  using (private.can_teach(organisation_id))
  with check (
    private.can_teach(organisation_id)
    and organisation_id = (select s.organisation_id from public.school_sessions s where s.id = session_id)
  );

create policy school_events_read on public.school_events
  for select to authenticated
  using (private.is_org_member(organisation_id));

create policy school_events_write on public.school_events
  for all to authenticated
  using (private.can_teach(organisation_id))
  with check (
    private.can_teach(organisation_id)
    and organisation_id = (select s.organisation_id from public.school_sessions s where s.id = session_id)
  );
