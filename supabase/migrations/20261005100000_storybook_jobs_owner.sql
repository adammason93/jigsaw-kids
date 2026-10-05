/*
  Owner of an async storybook job. clever-service records the signed-in user
  and only that user may read the job. Existing rows stay null and are not
  readable by id alone.

  Service role still bypasses RLS. No client policies are added: the browser
  must not read request_payload through PostgREST.
*/

alter table public.storybook_generation_jobs
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

comment on column public.storybook_generation_jobs.user_id is
  'auth.users id that created the job. Polling requires this match. Deleted with the user.';

create index if not exists storybook_generation_jobs_user_id_idx
  on public.storybook_generation_jobs (user_id);
