-- Live progress for async storybook jobs (clever-service patches during pipeline).

alter table public.storybook_generation_jobs
  add column if not exists progress smallint not null default 0
    check (progress >= 0 and progress <= 100);

alter table public.storybook_generation_jobs
  add column if not exists progress_label text;

comment on column public.storybook_generation_jobs.progress is
  '0–100 for reader UI; optional for async jobs.';
comment on column public.storybook_generation_jobs.progress_label is
  'Short status line for the book-building overlay.';
