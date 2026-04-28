/*
  Game Room: one JSON blob per signed-in user (scores for all mini-games).

  Policies: users may only read/write their own row via auth.uid().

  After applying: Dashboard → Authentication → Providers → Email (magic link).
  Add Site URL and Redirect URLs matching your deployed origin (Games path allowed).
*/

create table if not exists public.score_bundles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists score_bundles_updated_at_idx on public.score_bundles (updated_at desc);

alter table public.score_bundles enable row level security;

create policy "score_bundles_select_own"
  on public.score_bundles
  for select
  using (auth.uid() = user_id);

create policy "score_bundles_insert_own"
  on public.score_bundles
  for insert
  with check (auth.uid() = user_id);

create policy "score_bundles_update_own"
  on public.score_bundles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
