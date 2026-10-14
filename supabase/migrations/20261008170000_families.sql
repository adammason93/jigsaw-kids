/*
  Phase 1 family accounts.

  Additive only. Existing personal storage, school organisations, score
  bundles and generation jobs are unchanged.

  Child profiles are rows owned by a parent. They are not Supabase logins.
  Removing a profile hides it immediately. The parent can restore it or
  export it for 30 days. The next family snapshot then deletes it.

  Tables have row level security and no policies. Authenticated clients
  cannot read them directly. Parents use the functions below.
*/

create table public.families (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  consent_at timestamptz not null default now(),
  consent_version text not null default 'family-v1',
  created_at timestamptz not null default now()
);

create table public.family_adults (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  role text not null default 'parent' check (role = 'parent'),
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 24),
  avatar_id text not null,
  age_band text not null check (age_band in ('4-6', '7-9', '10-12')),
  status text not null default 'active' check (status in ('active', 'suspended', 'pending_deletion')),
  books_per_day integer not null default 3 check (books_per_day between 0 and 10),
  characters_per_day integer not null default 2 check (characters_per_day between 0 and 10),
  can_play_games boolean not null default true,
  deletion_requested_at timestamptz,
  purge_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (
      status = 'pending_deletion'
      and deletion_requested_at is not null
      and purge_after is not null
    )
    or (
      status <> 'pending_deletion'
      and deletion_requested_at is null
      and purge_after is null
    )
  )
);

create index child_profiles_family_idx on public.child_profiles (family_id);

alter table public.families enable row level security;
alter table public.family_adults enable row level security;
alter table public.child_profiles enable row level security;

revoke all on public.families from public, anon, authenticated;
revoke all on public.family_adults from public, anon, authenticated;
revoke all on public.child_profiles from public, anon, authenticated;

create or replace function private.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id
  from public.family_adults
  where user_id = auth.uid()
  limit 1;
$$;

revoke all on function private.current_family_id() from public, anon, authenticated;

create or replace function private.purge_due_children()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid := private.current_family_id();
begin
  if fam is null then
    return;
  end if;
  delete from public.child_profiles
  where family_id = fam
    and status = 'pending_deletion'
    and purge_after <= now();
end;
$$;

revoke all on function private.purge_due_children() from public, anon, authenticated;

create or replace function private.child_json(profile public.child_profiles)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', profile.id,
    'nickname', profile.nickname,
    'avatarId', profile.avatar_id,
    'ageBand', profile.age_band,
    'status', profile.status,
    'booksPerDay', profile.books_per_day,
    'charactersPerDay', profile.characters_per_day,
    'canPlayGames', profile.can_play_games,
    'deletionRequestedAt', profile.deletion_requested_at,
    'purgeAfter', profile.purge_after,
    'createdAt', profile.created_at
  );
$$;

revoke all on function private.child_json(public.child_profiles) from public, anon, authenticated;

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

create or replace function private.assert_avatar(p_avatar text)
returns void
language plpgsql
immutable
as $$
begin
  if p_avatar not in (
    'wondii-maya', 'wondii-leo', 'wondii-amara', 'wondii-finn', 'wondii-zara',
    'wondii-theo', 'wondii-nia', 'wondii-arlo', 'wondii-sofia', 'wondii-ravi',
    'wondii-elsie', 'wondii-jasper'
  ) then
    raise exception 'avatar' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.assert_avatar(text) from public, anon, authenticated;

create or replace function private.assert_child_fields(
  p_nickname text,
  p_avatar text,
  p_age_band text,
  p_books integer,
  p_characters integer
)
returns void
language plpgsql
immutable
as $$
begin
  if char_length(btrim(coalesce(p_nickname, ''))) < 1
    or char_length(btrim(p_nickname)) > 24
    or p_nickname ~ '[[:cntrl:]]|@' then
    raise exception 'nickname' using errcode = '22023';
  end if;
  perform private.assert_avatar(p_avatar);
  if p_age_band not in ('4-6', '7-9', '10-12') then
    raise exception 'age_band' using errcode = '22023';
  end if;
  if p_books is null or p_books < 0 or p_books > 10
    or p_characters is null or p_characters < 0 or p_characters > 10 then
    raise exception 'allowance' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.assert_child_fields(text, text, text, integer, integer) from public, anon, authenticated;

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
    'note', 'Profile record only. Stories and characters are not part of a child profile yet.',
    'profile', private.child_json(row)
  );
end;
$$;

revoke all on function public.family_snapshot() from public, anon, authenticated;
revoke all on function public.start_family(text) from public, anon, authenticated;
revoke all on function public.save_child_profile(uuid, text, text, text, integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.set_child_status(uuid, text) from public, anon, authenticated;
revoke all on function public.request_child_deletion(uuid) from public, anon, authenticated;
revoke all on function public.restore_child_profile(uuid) from public, anon, authenticated;
revoke all on function public.export_child_profile(uuid) from public, anon, authenticated;

grant execute on function public.family_snapshot() to authenticated;
grant execute on function public.start_family(text) to authenticated;
grant execute on function public.save_child_profile(uuid, text, text, text, integer, integer, boolean) to authenticated;
grant execute on function public.set_child_status(uuid, text) to authenticated;
grant execute on function public.request_child_deletion(uuid) to authenticated;
grant execute on function public.restore_child_profile(uuid) to authenticated;
grant execute on function public.export_child_profile(uuid) to authenticated;
