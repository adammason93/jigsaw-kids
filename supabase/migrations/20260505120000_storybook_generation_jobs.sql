/*
  Async picture-book generation: clever-service stores job rows and finishes
  work in EdgeRuntime.waitUntil (see storybook_async on POST, storybook_job on GET).
  No RLS policies — anon/authenticated cannot read via PostgREST; service_role only.
*/

create table if not exists public.storybook_generation_jobs (
  id uuid primary key,
  status text not null
    check (status in ('pending', 'running', 'complete', 'failed')),
  request_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb,
  http_status int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists storybook_generation_jobs_status_updated_idx
  on public.storybook_generation_jobs (status, updated_at desc);

alter table public.storybook_generation_jobs enable row level security;

comment on table public.storybook_generation_jobs is
  'Async storybook jobs for clever-service; accessed with SUPABASE_SERVICE_ROLE_KEY only.';
