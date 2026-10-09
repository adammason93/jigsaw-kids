/*
  Security follow-up for family accounts. Not a child login.

  Story jobs gain a nullable access_key_hash. Existing rows stay readable
  by id for 24 hours inside clever-service, then stop. New rows require
  the unguessable key. This column does not change current inserts.

  Child sessions are JWTs with app_metadata.account_kind = child.
  They cannot call adult account functions or use adult storage.
  A live child_devices row is required before any child content is
  returned. Revoking the row blocks the existing JWT. QR login is not
  enabled, and nothing in the website inserts device rows yet.

  Expired child profiles are deleted by private.purge_expired_child_profiles.
  A family visit runs it, and pg_cron runs it nightly when that extension
  is installed. If pg_cron is absent, public.purge_expired_child_profiles
  can be called by the service role from a scheduled function. Parents,
  children, and anonymous callers cannot execute it. Pause never sets
  the deletion clock.

  Speech stays on the existing ?ttsText= audio address. A repeat of the
  same reading is served from cache and does not call the speech provider.
  public.tts_quota_take counts a new reading once, in a single upsert, for
  one verified Cloudflare address. A database error does not call the
  provider. Parents, children, and anonymous callers cannot execute it.

  child-library-v1 export shape:
    library.books and library.characters are arrays.
    Phase 1 has no child-owned files, so both arrays are empty.
    When child creation exists, each book is
      { id, title, createdAt, pages: [{ text, imagePath }] }
    and each character is
      { id, name, createdAt, imagePath }.
    imagePath is a private storage path. The export mints short-lived
    download URLs at export time. It does not publish the files.
*/

alter table public.storybook_generation_jobs
  add column if not exists access_key_hash text,
  add column if not exists owner_user_id uuid;

comment on column public.storybook_generation_jobs.access_key_hash is
  'SHA-256 hex of the job capability key. Null only for jobs created before the key. Those stay id-readable for 24 hours.';

create or replace function private.is_child()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'account_kind', '') = 'child';
$$;

create or replace function private.reject_child()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if private.is_child() then
    raise exception 'child_not_permitted' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.is_child() from public, anon, authenticated;
revoke all on function private.reject_child() from public, anon, authenticated;
grant execute on function private.is_child() to authenticated;
grant execute on function private.reject_child() to authenticated;

create or replace function private.org_role(org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organisation_members m
  join public.organisations o on o.id = m.organisation_id
  where m.organisation_id = org
    and m.user_id = auth.uid()
    and m.status = 'active'
    and o.is_active
    and not private.is_child()
  limit 1;
$$;

create or replace function public.create_organisation(p_name text, p_short_name text, p_primary_colour text, p_website text)
returns public.organisations
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform private.reject_child();
  return private.create_organisation(p_name, p_short_name, p_primary_colour, p_website);
end;
$$;

create or replace function public.create_organisation_invite(p_org uuid, p_email text, p_role text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform private.reject_child();
  return private.create_organisation_invite(p_org, p_email, p_role);
end;
$$;

create or replace function public.accept_organisation_invite(p_token text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform private.reject_child();
  return private.accept_organisation_invite(p_token);
end;
$$;

create or replace function public.set_organisation_member_role(p_member uuid, p_role text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform private.reject_child();
  perform private.set_organisation_member_role(p_member, p_role);
end;
$$;

create or replace function public.remove_organisation_member(p_member uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform private.reject_child();
  perform private.remove_organisation_member(p_member);
end;
$$;

create or replace function public.revoke_organisation_invite(p_invite uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform private.reject_child();
  perform private.revoke_organisation_invite(p_invite);
end;
$$;

create or replace function public.school_join_lookup(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.reject_child();
  return private.school_join_lookup(p_code);
end;
$$;

create or replace function public.school_join(p_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.reject_child();
  return private.school_join(p_code, p_name);
end;
$$;

create or replace function public.school_join_answer(p_code text, p_participant uuid, p_choice text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.reject_child();
  return private.school_join_answer(p_code, p_participant, p_choice);
end;
$$;

drop policy if exists organisation_members_select on public.organisation_members;
create policy organisation_members_select
  on public.organisation_members
  for select
  to authenticated
  using (
    not private.is_child()
    and (private.is_org_member(organisation_id) or user_id = auth.uid())
  );

drop policy if exists "characters_room_select_own" on storage.objects;
drop policy if exists "characters_room_insert_own" on storage.objects;
drop policy if exists "characters_room_update_own" on storage.objects;
drop policy if exists "characters_room_delete_own" on storage.objects;

create policy "characters_room_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'characters_room'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not private.is_child()
  );
create policy "characters_room_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'characters_room'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not private.is_child()
  );
create policy "characters_room_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'characters_room'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not private.is_child()
  )
  with check (
    bucket_id = 'characters_room'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not private.is_child()
  );
create policy "characters_room_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'characters_room'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not private.is_child()
  );

drop policy if exists "characters_room_select_school" on storage.objects;
drop policy if exists "characters_room_insert_school" on storage.objects;
drop policy if exists "characters_room_update_school" on storage.objects;
drop policy if exists "characters_room_delete_school" on storage.objects;

create policy "characters_room_select_school"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'characters_room'
    and private.is_org_member(private.storage_school_id(name))
    and not private.is_child()
  );
create policy "characters_room_insert_school"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'characters_room'
    and private.is_org_member(private.storage_school_id(name))
    and not private.is_child()
  );
create policy "characters_room_update_school"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'characters_room'
    and private.is_org_member(private.storage_school_id(name))
    and not private.is_child()
  )
  with check (
    bucket_id = 'characters_room'
    and private.is_org_member(private.storage_school_id(name))
    and not private.is_child()
  );
create policy "characters_room_delete_school"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'characters_room'
    and private.is_org_member(private.storage_school_id(name))
    and not private.is_child()
  );

drop policy if exists "storybook_room_select_own" on storage.objects;
drop policy if exists "storybook_room_insert_own" on storage.objects;
drop policy if exists "storybook_room_update_own" on storage.objects;
drop policy if exists "storybook_room_delete_own" on storage.objects;

create policy "storybook_room_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'storybook_room'
    and split_part(name, '/', 1) = auth.uid()::text
    and not private.is_child()
  );
create policy "storybook_room_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'storybook_room'
    and split_part(name, '/', 1) = auth.uid()::text
    and not private.is_child()
  );
create policy "storybook_room_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'storybook_room'
    and split_part(name, '/', 1) = auth.uid()::text
    and not private.is_child()
  )
  with check (
    bucket_id = 'storybook_room'
    and split_part(name, '/', 1) = auth.uid()::text
    and not private.is_child()
  );
create policy "storybook_room_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'storybook_room'
    and split_part(name, '/', 1) = auth.uid()::text
    and not private.is_child()
  );

drop policy if exists "colouring_room_select_own" on storage.objects;
drop policy if exists "colouring_room_insert_own" on storage.objects;
drop policy if exists "colouring_room_update_own" on storage.objects;
drop policy if exists "colouring_room_delete_own" on storage.objects;

create policy "colouring_room_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'colouring_room'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not private.is_child()
  );
create policy "colouring_room_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'colouring_room'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not private.is_child()
  );
create policy "colouring_room_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'colouring_room'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not private.is_child()
  )
  with check (
    bucket_id = 'colouring_room'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not private.is_child()
  );
create policy "colouring_room_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'colouring_room'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not private.is_child()
  );

drop policy if exists "score_bundles_select_own" on public.score_bundles;
drop policy if exists "score_bundles_insert_own" on public.score_bundles;
drop policy if exists "score_bundles_update_own" on public.score_bundles;

create policy "score_bundles_select_own"
  on public.score_bundles for select to authenticated
  using (auth.uid() = user_id and not private.is_child());
create policy "score_bundles_insert_own"
  on public.score_bundles for insert to authenticated
  with check (auth.uid() = user_id and not private.is_child());
create policy "score_bundles_update_own"
  on public.score_bundles for update to authenticated
  using (auth.uid() = user_id and not private.is_child())
  with check (auth.uid() = user_id and not private.is_child());

create table public.child_devices (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (auth_user_id)
);

create index child_devices_profile_idx on public.child_devices (child_profile_id);

alter table public.child_devices enable row level security;
revoke all on public.child_devices from public, anon, authenticated;

create index if not exists child_profiles_purge_idx
  on public.child_profiles (purge_after)
  where status = 'pending_deletion';

create or replace function private.purge_expired_child_profiles()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.child_profiles
  where status = 'pending_deletion'
    and purge_after is not null
    and purge_after <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create or replace function private.purge_due_children()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.purge_expired_child_profiles();
end;
$$;

revoke all on function private.purge_expired_child_profiles() from public, anon, authenticated;
revoke all on function private.purge_due_children() from public, anon, authenticated;

-- Service-role entry for a scheduled Edge Function if pg_cron is not installed.
-- Parents, children, and anonymous callers cannot execute it.
create or replace function public.purge_expired_child_profiles()
returns integer
language sql
security definer
set search_path = public
as $$
  select private.purge_expired_child_profiles();
$$;

revoke all on function public.purge_expired_child_profiles() from public, anon, authenticated;
grant execute on function public.purge_expired_child_profiles() to service_role;

-- Hourly speech allowance. The audio URL is unchanged.
-- 80-character taps are word reads. Longer texts are page reads.
-- One upsert so overlapping requests cannot pass the same check twice.
create table private.tts_quota (
  bucket text primary key,
  chars integer not null,
  short_count integer not null,
  long_count integer not null,
  updated_at timestamptz not null default now()
);

create table private.tts_audio (
  content_hash text primary key,
  audio_base64 text not null,
  created_at timestamptz not null default now()
);

create or replace function public.tts_quota_take(p_bucket text, p_chars integer, p_short boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  if p_bucket is null or length(p_bucket) < 32 or p_chars is null or p_chars < 1 or p_chars > 4000 then
    return false;
  end if;
  delete from private.tts_quota where updated_at < now() - interval '2 hours';
  delete from private.tts_audio where created_at < now() - interval '1 day';
  with upsert as (
    insert into private.tts_quota as quota (bucket, chars, short_count, long_count)
    values (
      p_bucket,
      p_chars,
      case when p_short then 1 else 0 end,
      case when p_short then 0 else 1 end
    )
    on conflict (bucket) do update
      set chars = quota.chars + excluded.chars,
          short_count = quota.short_count + excluded.short_count,
          long_count = quota.long_count + excluded.long_count,
          updated_at = now()
      where quota.chars + excluded.chars <= 400000
        and quota.short_count + excluded.short_count <= 4000
        and quota.long_count + excluded.long_count <= 500
    returning bucket
  )
  select exists (select 1 from upsert) into allowed;
  return allowed;
end;
$$;

create or replace function public.tts_audio_read(p_hash text)
returns text
language sql
security definer
set search_path = public
as $$
  select audio_base64 from private.tts_audio where content_hash = p_hash;
$$;

create or replace function public.tts_audio_write(p_hash text, p_audio text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hash is null or length(p_hash) < 32 or p_audio is null or length(p_audio) < 8 or length(p_audio) > 3000000 then
    return;
  end if;
  insert into private.tts_audio (content_hash, audio_base64)
  values (p_hash, p_audio)
  on conflict (content_hash) do nothing;
end;
$$;

revoke all on function public.tts_quota_take(text, integer, boolean) from public, anon, authenticated;
grant execute on function public.tts_quota_take(text, integer, boolean) to service_role;
revoke all on function public.tts_audio_read(text) from public, anon, authenticated;
grant execute on function public.tts_audio_read(text) to service_role;
revoke all on function public.tts_audio_write(text, text) from public, anon, authenticated;
grant execute on function public.tts_audio_write(text, text) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'purge-expired-child-profiles';
    perform cron.schedule(
      'purge-expired-child-profiles',
      '15 1 * * *',
      'select private.purge_expired_child_profiles()'
    );
  end if;
end;
$$;

create or replace function public.child_content_access()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  device public.child_devices;
  profile public.child_profiles;
begin
  if auth.uid() is null or not private.is_child() then
    return jsonb_build_object('allowed', false, 'reason', 'not_child');
  end if;
  select * into device
  from public.child_devices
  where auth_user_id = auth.uid();
  if device.id is null or device.revoked_at is not null then
    return jsonb_build_object('allowed', false, 'reason', 'device_revoked');
  end if;
  select * into profile
  from public.child_profiles
  where id = device.child_profile_id;
  if profile.id is null or profile.status <> 'active' then
    return jsonb_build_object('allowed', false, 'reason', 'profile_unavailable');
  end if;
  return jsonb_build_object('allowed', true, 'childId', profile.id);
end;
$$;

create or replace function public.revoke_child_device(p_device uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  device public.child_devices;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  select d.* into device
  from public.child_devices d
  join public.child_profiles c on c.id = d.child_profile_id
  where d.id = p_device
    and c.family_id = fam;
  if device.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if device.revoked_at is null then
    update public.child_devices
    set revoked_at = now()
    where id = device.id;
  end if;
  return jsonb_build_object('id', device.id, 'revoked', true);
end;
$$;

revoke all on function public.child_content_access() from public, anon, authenticated;
revoke all on function public.revoke_child_device(uuid) from public, anon, authenticated;
grant execute on function public.child_content_access() to authenticated;
grant execute on function public.revoke_child_device(uuid) to authenticated;

comment on function public.child_content_access() is
  'Live device check. A child JWT is refused when its device row is missing or revoked_at is set, even if the access token has not expired. QR login is not enabled.';
create or replace function public.family_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  adult public.family_adults;
  family public.families;
begin
  if auth.uid() is null then
    return jsonb_build_object('family', null, 'children', '[]'::jsonb);
  end if;
  perform private.reject_child();
  perform private.purge_due_children();
  fam := private.current_family_id();
  if fam is null then
    return jsonb_build_object('family', null, 'children', '[]'::jsonb);
  end if;
  select * into adult from public.family_adults where user_id = auth.uid();
  select * into family from public.families where id = fam;
  return jsonb_build_object(
    'family', jsonb_build_object(
      'id', family.id,
      'displayName', adult.display_name,
      'consentAt', family.consent_at,
      'consentVersion', family.consent_version
    ),
    'children', coalesce((
      select jsonb_agg(private.child_json(c) order by c.created_at)
      from public.child_profiles c
      where c.family_id = fam
    ), '[]'::jsonb)
  );
end;
$$;


create or replace function public.start_family(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  fam uuid;
  name text := btrim(coalesce(p_display_name, ''));
begin
  if uid is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  if char_length(name) < 2 or char_length(name) > 40 or name ~ '[[:cntrl:]]|[<>]' then
    raise exception 'family_name' using errcode = '22023';
  end if;
  select family_id into fam from public.family_adults where user_id = uid;
  if fam is null then
    insert into public.families (display_name, owner_user_id)
    values (name, uid)
    returning id into fam;
    insert into public.family_adults (family_id, user_id, display_name)
    values (fam, uid, name);
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('full_name', name)
    where id = uid;
  end if;
  return public.family_snapshot();
end;
$$;


create or replace function public.save_child_profile(
  p_id uuid,
  p_nickname text,
  p_avatar text,
  p_age_band text,
  p_books integer,
  p_characters integer,
  p_games boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  row public.child_profiles;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  perform private.purge_due_children();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  perform private.assert_child_fields(p_nickname, p_avatar, p_age_band, p_books, p_characters);
  if p_id is null then
    insert into public.child_profiles (
      family_id, nickname, avatar_id, age_band, books_per_day, characters_per_day, can_play_games
    ) values (
      fam, btrim(p_nickname), p_avatar, p_age_band, p_books, p_characters, coalesce(p_games, true)
    );
  else
    select * into row
    from public.child_profiles
    where id = p_id and family_id = fam;
    if row.id is null then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    if row.status = 'pending_deletion' then
      raise exception 'pending_deletion' using errcode = '42501';
    end if;
    update public.child_profiles
    set nickname = btrim(p_nickname),
        avatar_id = p_avatar,
        age_band = p_age_band,
        books_per_day = p_books,
        characters_per_day = p_characters,
        can_play_games = coalesce(p_games, true),
        updated_at = now()
    where id = p_id and family_id = fam;
  end if;
  return public.family_snapshot();
end;
$$;


create or replace function public.set_child_status(p_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  row public.child_profiles;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  if p_status not in ('active', 'suspended') then
    raise exception 'status' using errcode = '22023';
  end if;
  perform private.purge_due_children();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  select * into row from public.child_profiles where id = p_id and family_id = fam;
  if row.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if row.status = 'pending_deletion' then
    raise exception 'pending_deletion' using errcode = '42501';
  end if;
  update public.child_profiles
  set status = p_status, updated_at = now()
  where id = p_id and family_id = fam;
  return public.family_snapshot();
end;
$$;


create or replace function public.request_child_deletion(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  row public.child_profiles;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  perform private.purge_due_children();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  select * into row from public.child_profiles where id = p_id and family_id = fam;
  if row.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if row.status <> 'pending_deletion' then
    update public.child_profiles
    set status = 'pending_deletion',
        deletion_requested_at = now(),
        purge_after = now() + interval '30 days',
        updated_at = now()
    where id = p_id and family_id = fam;
  end if;
  return public.family_snapshot();
end;
$$;


create or replace function public.restore_child_profile(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  row public.child_profiles;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  perform private.purge_due_children();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  select * into row from public.child_profiles where id = p_id and family_id = fam;
  if row.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if row.status <> 'pending_deletion' or row.purge_after <= now() then
    raise exception 'not_restorable' using errcode = '42501';
  end if;
  update public.child_profiles
  set status = 'active',
      deletion_requested_at = null,
      purge_after = null,
      updated_at = now()
  where id = p_id and family_id = fam;
  return public.family_snapshot();
end;
$$;


create or replace function public.export_child_profile(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  row public.child_profiles;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  perform private.purge_due_children();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  select * into row from public.child_profiles where id = p_id and family_id = fam;
  if row.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'exportedAt', now(),
    'purgeAfter', row.purge_after,
    'profile', private.child_json(row),
    'library', jsonb_build_object(
      'contract', 'child-library-v1',
      'books', '[]'::jsonb,
      'characters', '[]'::jsonb
    )
  );
end;
$$;

