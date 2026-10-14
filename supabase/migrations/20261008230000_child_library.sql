-- Child libraries, parent sharing, and daily creation limits.
-- Apply after 20261008220000_child_home.sql. Not applied to the hosted database.
-- Children do not gain access to adult story or character folders.
-- A share stores a reference to the parent's own file, not a second copy.

create table private.child_books (
  child_profile_id uuid not null references public.child_profiles (id) on delete cascade,
  book_id text not null check (char_length(book_id) between 1 and 80),
  title text not null check (char_length(title) between 1 and 80),
  created_on date not null,
  favourite boolean not null default false,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (child_profile_id, book_id)
);

create table private.child_characters (
  child_profile_id uuid not null references public.child_profiles (id) on delete cascade,
  character_id text not null check (char_length(character_id) between 1 and 80),
  name text not null check (char_length(name) between 1 and 40),
  created_on date not null,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (child_profile_id, character_id)
);

create table private.child_shelves (
  child_profile_id uuid primary key references public.child_profiles (id) on delete cascade,
  shelf jsonb not null,
  updated_at timestamptz not null default now()
);

create table private.child_character_indexes (
  child_profile_id uuid primary key references public.child_profiles (id) on delete cascade,
  items jsonb not null,
  updated_at timestamptz not null default now()
);

create table private.library_shares (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.child_profiles (id) on delete cascade,
  kind text not null check (kind in ('book', 'character')),
  source_bucket text not null check (source_bucket in ('storybook_room', 'characters_room')),
  source_path text not null,
  source_id text not null,
  title text not null check (char_length(title) between 1 and 80),
  preview jsonb,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (child_profile_id, kind, source_bucket, source_path, source_id)
);

create table private.creation_reservations (
  child_profile_id uuid not null references public.child_profiles (id) on delete cascade,
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{8,80}$'),
  kind text not null check (kind in ('book', 'character')),
  day date not null,
  status text not null check (status in ('reserved', 'completed', 'refunded')),
  created_at timestamptz not null default now(),
  primary key (child_profile_id, idempotency_key)
);

revoke all on private.child_books from public, anon, authenticated;
revoke all on private.child_characters from public, anon, authenticated;
revoke all on private.child_shelves from public, anon, authenticated;
revoke all on private.child_character_indexes from public, anon, authenticated;
revoke all on private.library_shares from public, anon, authenticated;
revoke all on private.creation_reservations from public, anon, authenticated;

create or replace function private.london_today()
returns date
language sql
stable
as $$
  select (timezone('Europe/London', now()))::date;
$$;

create or replace function private.session_child_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  access jsonb := public.child_content_access();
begin
  if coalesce(access ->> 'allowed', '') <> 'true' then
    return null;
  end if;
  return (access ->> 'childId')::uuid;
end;
$$;

create or replace function private.creation_remaining(p_child uuid, p_kind text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.child_profiles;
  allowance integer;
  used_today integer;
  reserved_today integer;
  today date := private.london_today();
begin
  select * into profile from public.child_profiles where id = p_child;
  if profile.id is null then
    return 0;
  end if;
  allowance := least(
    case when p_kind = 'character' then profile.characters_per_day else profile.books_per_day end,
    10
  );
  if p_kind = 'character' then
    select count(*) into used_today from private.child_characters
      where child_profile_id = p_child and created_on = today;
  else
    select count(*) into used_today from private.child_books
      where child_profile_id = p_child and created_on = today;
  end if;
  select count(*) into reserved_today from private.creation_reservations
    where child_profile_id = p_child and kind = p_kind and day = today and status = 'reserved';
  return greatest(allowance - used_today - reserved_today, 0);
end;
$$;

revoke all on function private.london_today() from public, anon, authenticated;
revoke all on function private.session_child_id() from public, anon, authenticated;
revoke all on function private.creation_remaining(uuid, text) from public, anon, authenticated;

create or replace function public.reserve_child_creation(p_kind text, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := private.session_child_id();
  profile public.child_profiles;
  today date := private.london_today();
  existing private.creation_reservations;
  remaining integer;
begin
  if cid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_child');
  end if;
  if p_kind not in ('book', 'character') or coalesce(p_key, '') !~ '^[A-Za-z0-9_-]{8,80}$' then
    raise exception 'reservation_invalid' using errcode = '22023';
  end if;
  select * into profile from public.child_profiles where id = cid for update;
  if profile.status <> 'active' then
    return jsonb_build_object('allowed', false, 'reason', 'profile_unavailable');
  end if;
  select * into existing from private.creation_reservations
    where child_profile_id = cid and idempotency_key = p_key;
  if found then
    return jsonb_build_object(
      'allowed', existing.status = 'reserved' or existing.status = 'completed',
      'reason', existing.status,
      'key', p_key,
      'remaining', private.creation_remaining(cid, p_kind)
    );
  end if;
  remaining := private.creation_remaining(cid, p_kind);
  if remaining < 1 then
    return jsonb_build_object('allowed', false, 'reason', 'allowance', 'remaining', 0, 'key', p_key);
  end if;
  insert into private.creation_reservations (child_profile_id, idempotency_key, kind, day, status)
  values (cid, p_key, p_kind, today, 'reserved');
  return jsonb_build_object('allowed', true, 'reason', 'reserved', 'key', p_key, 'remaining', remaining - 1);
end;
$$;

create or replace function public.refund_child_creation(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := private.session_child_id();
  updated integer;
begin
  if cid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_child');
  end if;
  update private.creation_reservations
    set status = 'refunded'
    where child_profile_id = cid
      and idempotency_key = p_key
      and status = 'reserved';
  get diagnostics updated = row_count;
  return jsonb_build_object('allowed', true, 'refunded', updated > 0);
end;
$$;

create or replace function public.save_child_shelf(p_shelf jsonb, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := private.session_child_id();
  profile public.child_profiles;
  item jsonb;
  v_book text;
  v_title text;
  incoming text[] := array[]::text[];
  new_count integer := 0;
  held integer := 0;
  remaining integer;
  key text := left(btrim(coalesce(p_key, '')), 80);
begin
  if cid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_child');
  end if;
  if jsonb_typeof(p_shelf) <> 'array' or jsonb_array_length(p_shelf) > 40 then
    raise exception 'shelf_invalid' using errcode = '22023';
  end if;
  if octet_length(p_shelf::text) > 6000000 then
    raise exception 'shelf_too_large' using errcode = '22023';
  end if;
  select * into profile from public.child_profiles where id = cid for update;
  if profile.status <> 'active' then
    return jsonb_build_object('allowed', false, 'reason', 'profile_unavailable');
  end if;
  for item in select value from jsonb_array_elements(p_shelf)
  loop
    v_book := left(btrim(coalesce(item ->> 'id', '')), 80);
    v_title := left(btrim(coalesce(item ->> 'title', '')), 80);
    if v_book = '' or v_title = '' or v_book = any (incoming) then
      raise exception 'shelf_invalid' using errcode = '22023';
    end if;
    incoming := incoming || v_book;
    if not exists (
      select 1 from private.child_books
      where child_profile_id = cid and book_id = v_book
    ) then
      new_count := new_count + 1;
    end if;
  end loop;
  if key <> '' and exists (
    select 1 from private.creation_reservations
    where child_profile_id = cid and idempotency_key = key and status = 'reserved'
  ) then
    held := 1;
  end if;
  remaining := private.creation_remaining(cid, 'book');
  if new_count > remaining + held then
    return jsonb_build_object('allowed', false, 'reason', 'allowance', 'remaining', remaining);
  end if;
  update private.child_books
    set removed_at = now()
    where child_profile_id = cid
      and removed_at is null
      and not (book_id = any (incoming));
  for item in select value from jsonb_array_elements(p_shelf)
  loop
    v_book := left(btrim(item ->> 'id'), 80);
    v_title := left(btrim(item ->> 'title'), 80);
    insert into private.child_books (child_profile_id, book_id, title, created_on, favourite)
    values (
      cid,
      v_book,
      v_title,
      private.london_today(),
      (item ->> 'favourite') = 'true'
    )
    on conflict (child_profile_id, book_id) do update
      set title = excluded.title,
          removed_at = null,
          favourite = excluded.favourite;
  end loop;
  if held = 1 and new_count > 0 then
    update private.creation_reservations
      set status = 'completed'
      where child_profile_id = cid and idempotency_key = key and status = 'reserved';
  end if;
  insert into private.child_shelves (child_profile_id, shelf, updated_at)
  values (cid, p_shelf, now())
  on conflict (child_profile_id) do update
    set shelf = excluded.shelf, updated_at = now();
  return jsonb_build_object('allowed', true, 'remaining', private.creation_remaining(cid, 'book'));
end;
$$;

create or replace function public.save_child_characters(p_items jsonb, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := private.session_child_id();
  profile public.child_profiles;
  item jsonb;
  v_character text;
  char_name text;
  incoming text[] := array[]::text[];
  new_count integer := 0;
  held integer := 0;
  remaining integer;
  key text := left(btrim(coalesce(p_key, '')), 80);
begin
  if cid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_child');
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 40 then
    raise exception 'characters_invalid' using errcode = '22023';
  end if;
  if octet_length(p_items::text) > 2000000 then
    raise exception 'characters_too_large' using errcode = '22023';
  end if;
  select * into profile from public.child_profiles where id = cid for update;
  if profile.status <> 'active' then
    return jsonb_build_object('allowed', false, 'reason', 'profile_unavailable');
  end if;
  for item in select value from jsonb_array_elements(p_items)
  loop
    v_character := left(btrim(coalesce(item ->> 'id', '')), 80);
    char_name := left(btrim(coalesce(item ->> 'name', '')), 40);
    if v_character = '' or char_name = '' or v_character = any (incoming) then
      raise exception 'characters_invalid' using errcode = '22023';
    end if;
    incoming := incoming || v_character;
    if not exists (
      select 1 from private.child_characters
      where child_profile_id = cid and character_id = v_character
    ) then
      new_count := new_count + 1;
    end if;
  end loop;
  if key <> '' and exists (
    select 1 from private.creation_reservations
    where child_profile_id = cid and idempotency_key = key and status = 'reserved'
  ) then
    held := 1;
  end if;
  remaining := private.creation_remaining(cid, 'character');
  if new_count > remaining + held then
    return jsonb_build_object('allowed', false, 'reason', 'allowance', 'remaining', remaining);
  end if;
  update private.child_characters
    set removed_at = now()
    where child_profile_id = cid
      and removed_at is null
      and not (character_id = any (incoming));
  for item in select value from jsonb_array_elements(p_items)
  loop
    v_character := left(btrim(item ->> 'id'), 80);
    char_name := left(btrim(item ->> 'name'), 40);
    insert into private.child_characters (child_profile_id, character_id, name, created_on)
    values (cid, v_character, char_name, private.london_today())
    on conflict (child_profile_id, character_id) do update
      set name = excluded.name, removed_at = null;
  end loop;
  if held = 1 and new_count > 0 then
    update private.creation_reservations
      set status = 'completed'
      where child_profile_id = cid and idempotency_key = key and status = 'reserved';
  end if;
  insert into private.child_character_indexes (child_profile_id, items, updated_at)
  values (cid, p_items, now())
  on conflict (child_profile_id) do update
    set items = excluded.items, updated_at = now();
  return jsonb_build_object('allowed', true, 'remaining', private.creation_remaining(cid, 'character'));
end;
$$;

create or replace function public.share_library_item(
  p_child uuid,
  p_kind text,
  p_bucket text,
  p_path text,
  p_source text,
  p_title text,
  p_preview jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  v_title text := left(btrim(coalesce(p_title, '')), 80);
  source_id text := left(btrim(coalesce(p_source, '')), 80);
  share_id uuid;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  if p_kind not in ('book', 'character') or p_bucket not in ('storybook_room', 'characters_room') then
    raise exception 'share_invalid' using errcode = '22023';
  end if;
  if v_title = '' or source_id = '' or position(auth.uid()::text || '/' in coalesce(p_path, '')) <> 1 then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if p_preview is not null and (
    octet_length(p_preview::text) > 20000 or p_preview::text ilike '%data:%'
  ) then
    raise exception 'preview_invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.child_profiles
    where id = p_child and family_id = fam and status <> 'pending_deletion'
  ) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into private.library_shares (
    family_id, child_profile_id, kind, source_bucket, source_path, source_id, title, preview, created_by
  ) values (
    fam, p_child, p_kind, p_bucket, p_path, source_id, v_title, p_preview, auth.uid()
  )
  on conflict (child_profile_id, kind, source_bucket, source_path, source_id) do update
    set title = excluded.title, preview = excluded.preview
  returning id into share_id;
  return jsonb_build_object('id', share_id, 'shared', true);
end;
$$;

create or replace function public.unshare_library_item(p_share uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  removed integer;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  fam := private.current_family_id();
  delete from private.library_shares
    where id = p_share and family_id = fam;
  get diagnostics removed = row_count;
  if removed = 0 then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('removed', true);
end;
$$;

create or replace function public.child_shelf()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := private.session_child_id();
  stored jsonb;
begin
  if cid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_child');
  end if;
  select shelf into stored from private.child_shelves where child_profile_id = cid;
  return jsonb_build_object('allowed', true, 'shelf', coalesce(stored, '[]'::jsonb));
end;
$$;

create or replace function public.child_characters()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := private.session_child_id();
  stored jsonb;
begin
  if cid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_child');
  end if;
  select items into stored from private.child_character_indexes where child_profile_id = cid;
  return jsonb_build_object('allowed', true, 'characters', coalesce(stored, '[]'::jsonb));
end;
$$;

create or replace function public.parent_child_activity(p_child uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  profile public.child_profiles;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  fam := private.current_family_id();
  select * into profile from public.child_profiles where id = p_child and family_id = fam;
  if profile.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'childId', profile.id,
    'booksRemaining', private.creation_remaining(profile.id, 'book'),
    'charactersRemaining', private.creation_remaining(profile.id, 'character'),
    'books', coalesce((
      select jsonb_agg(jsonb_build_object('id', book_id, 'title', title, 'favourite', favourite, 'createdAt', created_at) order by created_at desc)
      from private.child_books
      where child_profile_id = profile.id and removed_at is null
    ), '[]'::jsonb),
    'characters', coalesce((
      select jsonb_agg(jsonb_build_object('id', character_id, 'name', name, 'createdAt', created_at) order by created_at desc)
      from private.child_characters
      where child_profile_id = profile.id and removed_at is null
    ), '[]'::jsonb),
    'shares', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'title', title, 'sourceId', source_id) order by created_at desc)
      from private.library_shares
      where child_profile_id = profile.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.set_child_book_favourite(p_book text, p_favourite boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := private.session_child_id();
  updated integer;
begin
  if cid is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_child');
  end if;
  update private.child_books
    set favourite = coalesce(p_favourite, false)
    where child_profile_id = cid
      and book_id = left(btrim(coalesce(p_book, '')), 80)
      and removed_at is null;
  get diagnostics updated = row_count;
  return jsonb_build_object('allowed', updated > 0);
end;
$$;

create or replace function public.child_home()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  access jsonb;
  profile public.child_profiles;
  continue_id text;
begin
  access := public.child_content_access();
  if coalesce(access ->> 'allowed', '') <> 'true' then
    return access;
  end if;
  select * into profile
  from public.child_profiles
  where id = (access ->> 'childId')::uuid
    and status = 'active';
  if profile.id is null then
    return jsonb_build_object('allowed', false, 'reason', 'profile_unavailable');
  end if;
  select book_id into continue_id from private.child_books
    where child_profile_id = profile.id and removed_at is null
    order by favourite desc, created_at desc
    limit 1;
  return jsonb_build_object(
    'allowed', true,
    'nickname', profile.nickname,
    'avatarId', profile.avatar_id,
    'ageBand', profile.age_band,
    'booksPerDay', profile.books_per_day,
    'charactersPerDay', profile.characters_per_day,
    'booksRemaining', private.creation_remaining(profile.id, 'book'),
    'charactersRemaining', private.creation_remaining(profile.id, 'character'),
    'canPlayGames', profile.can_play_games,
    'continueId', continue_id,
    'books', coalesce((
      select jsonb_agg(jsonb_build_object('id', book_id, 'title', title, 'favourite', favourite) order by created_at desc)
      from private.child_books
      where child_profile_id = profile.id and removed_at is null
    ), '[]'::jsonb),
    'characters', coalesce((
      select jsonb_agg(jsonb_build_object('id', character_id, 'name', name) order by created_at desc)
      from private.child_characters
      where child_profile_id = profile.id and removed_at is null
    ), '[]'::jsonb),
    'sharedBooks', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'sourceId', source_id, 'preview', preview) order by created_at desc)
      from private.library_shares
      where child_profile_id = profile.id and kind = 'book'
    ), '[]'::jsonb),
    'sharedCharacters', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'sourceId', source_id) order by created_at desc)
      from private.library_shares
      where child_profile_id = profile.id and kind = 'character'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.reserve_child_creation(text, text) from public, anon, authenticated;
revoke all on function public.refund_child_creation(text) from public, anon, authenticated;
revoke all on function public.save_child_shelf(jsonb, text) from public, anon, authenticated;
revoke all on function public.save_child_characters(jsonb, text) from public, anon, authenticated;
revoke all on function public.share_library_item(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.unshare_library_item(uuid) from public, anon, authenticated;
revoke all on function public.child_shelf() from public, anon, authenticated;
revoke all on function public.child_characters() from public, anon, authenticated;
revoke all on function public.parent_child_activity(uuid) from public, anon, authenticated;
revoke all on function public.set_child_book_favourite(text, boolean) from public, anon, authenticated;
revoke all on function public.child_home() from public, anon, authenticated;

grant execute on function public.reserve_child_creation(text, text) to authenticated;
grant execute on function public.refund_child_creation(text) to authenticated;
grant execute on function public.save_child_shelf(jsonb, text) to authenticated;
grant execute on function public.save_child_characters(jsonb, text) to authenticated;
grant execute on function public.share_library_item(uuid, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.unshare_library_item(uuid) to authenticated;
grant execute on function public.child_shelf() to authenticated;
grant execute on function public.child_characters() to authenticated;
grant execute on function public.parent_child_activity(uuid) to authenticated;
grant execute on function public.set_child_book_favourite(text, boolean) to authenticated;
grant execute on function public.child_home() to authenticated;
