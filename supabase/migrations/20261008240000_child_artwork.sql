-- Private artwork for child books, child characters, and parent shares.
-- Apply after 20261008230000_child_library.sql. Not applied to the hosted database.
-- Adult storybook_room and characters_room policies are not changed.
-- A share the child can open lives in this bucket. Removing the share row
-- removes read access even if a file is still present.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'child_library',
  'child_library',
  false,
  8000000,
  array['image/jpeg', 'image/png', 'image/webp', 'application/json']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table private.generation_claims (
  child_profile_id uuid not null references public.child_profiles (id) on delete cascade,
  idempotency_key text not null,
  kind text not null check (kind in ('book', 'character')),
  created_at timestamptz not null default now(),
  primary key (child_profile_id, idempotency_key)
);

revoke all on private.generation_claims from public, anon, authenticated;

create or replace function private.session_child_folder()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(public.child_content_access() ->> 'allowed', '') = 'true'
      then public.child_content_access() ->> 'childId'
    else null
  end;
$$;

create or replace function private.parent_owns_child_folder(p_child text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(p_child, '') !~ '^[0-9a-f-]{36}$' then
    return false;
  end if;
  return exists (
    select 1
    from public.child_profiles
    where id = p_child::uuid
      and family_id = private.current_family_id()
      and not private.is_child()
  );
end;
$$;

create or replace function private.child_share_visible(p_share text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(p_share, '') !~ '^[0-9a-f-]{36}$' then
    return false;
  end if;
  return exists (
    select 1
    from private.library_shares
    where id = p_share::uuid
      and child_profile_id::text = private.session_child_folder()
  );
end;
$$;

revoke all on function private.session_child_folder() from public, anon, authenticated;
revoke all on function private.parent_owns_child_folder(text) from public, anon, authenticated;
revoke all on function private.child_share_visible(text) from public, anon, authenticated;

create or replace function public.claim_child_generation(p_kind text, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := private.session_child_id();
  reservation private.creation_reservations;
  inserted text;
begin
  if cid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_child');
  end if;
  if p_kind not in ('book', 'character') or coalesce(p_key, '') !~ '^[A-Za-z0-9_-]{8,80}$' then
    return jsonb_build_object('allowed', false, 'reason', 'allowance');
  end if;
  select * into reservation
  from private.creation_reservations
  where child_profile_id = cid and idempotency_key = p_key
  for update;
  if not found or reservation.status <> 'reserved' or reservation.kind <> p_kind or reservation.day <> private.london_today() then
    return jsonb_build_object('allowed', false, 'reason', 'already_used');
  end if;
  insert into private.generation_claims (child_profile_id, idempotency_key, kind)
  values (cid, p_key, p_kind)
  on conflict do nothing
  returning idempotency_key into inserted;
  if inserted is null then
    return jsonb_build_object('allowed', false, 'reason', 'already_used');
  end if;
  return jsonb_build_object('allowed', true, 'reason', 'claimed', 'childId', cid, 'key', p_key);
end;
$$;

create or replace function public.service_refund_child_generation(p_child uuid, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from private.generation_claims
  where child_profile_id = p_child and idempotency_key = p_key;
  update private.creation_reservations
    set status = 'refunded'
    where child_profile_id = p_child
      and idempotency_key = p_key
      and status = 'reserved';
  return jsonb_build_object('refunded', true);
end;
$$;

revoke all on function public.claim_child_generation(text, text) from public, anon, authenticated;
revoke all on function public.service_refund_child_generation(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_child_generation(text, text) to authenticated;
grant execute on function public.service_refund_child_generation(uuid, text) to service_role;

drop policy if exists "child_library_child_read" on storage.objects;
drop policy if exists "child_library_child_insert" on storage.objects;
drop policy if exists "child_library_child_update" on storage.objects;
drop policy if exists "child_library_child_delete" on storage.objects;
drop policy if exists "child_library_parent_read" on storage.objects;
drop policy if exists "child_library_parent_insert" on storage.objects;
drop policy if exists "child_library_parent_update" on storage.objects;
drop policy if exists "child_library_parent_delete" on storage.objects;

create policy "child_library_child_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'child_library'
    and split_part(name, '/', 1) = private.session_child_folder()
    and (
      split_part(name, '/', 2) in ('books', 'characters')
      or (
        split_part(name, '/', 2) = 'shared'
        and private.child_share_visible(split_part(name, '/', 3))
      )
    )
  );

create policy "child_library_child_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'child_library'
    and split_part(name, '/', 1) = private.session_child_folder()
    and split_part(name, '/', 2) in ('books', 'characters')
  );

create policy "child_library_child_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'child_library'
    and split_part(name, '/', 1) = private.session_child_folder()
    and split_part(name, '/', 2) in ('books', 'characters')
  )
  with check (
    bucket_id = 'child_library'
    and split_part(name, '/', 1) = private.session_child_folder()
    and split_part(name, '/', 2) in ('books', 'characters')
  );

create policy "child_library_child_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'child_library'
    and split_part(name, '/', 1) = private.session_child_folder()
    and split_part(name, '/', 2) in ('books', 'characters')
  );

create policy "child_library_parent_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'child_library'
    and private.parent_owns_child_folder(split_part(name, '/', 1))
  );

create policy "child_library_parent_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'child_library'
    and private.parent_owns_child_folder(split_part(name, '/', 1))
  );

create policy "child_library_parent_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'child_library'
    and private.parent_owns_child_folder(split_part(name, '/', 1))
  )
  with check (
    bucket_id = 'child_library'
    and private.parent_owns_child_folder(split_part(name, '/', 1))
  );

create policy "child_library_parent_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'child_library'
    and private.parent_owns_child_folder(split_part(name, '/', 1))
  );
