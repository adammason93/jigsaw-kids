/*
  When a story job reaches a terminal state, clever-service sets completed_at
  and replaces request_payload with short metadata (no photos, names, or plot).

  The check below rejects new writes that still contain a data:image payload.
  NOT VALID so existing rows are not rewritten here — scrubbing those rows is
  a separate manual script the founder runs by hand.
*/

alter table public.storybook_generation_jobs
  add column if not exists completed_at timestamptz;

comment on column public.storybook_generation_jobs.completed_at is
  'Set when status becomes complete or failed. Used by the 72 hour purge.';

create index if not exists storybook_generation_jobs_status_completed_idx
  on public.storybook_generation_jobs (status, completed_at);

alter table public.storybook_generation_jobs
  drop constraint if exists storybook_jobs_request_payload_no_data_image;

alter table public.storybook_generation_jobs
  add constraint storybook_jobs_request_payload_no_data_image
  check (coalesce(request_payload::text, '') !~* 'data:image/') not valid;
