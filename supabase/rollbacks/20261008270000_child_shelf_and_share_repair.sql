-- Roll back 20261008270000 only. Do not run the original 20261008230000 file again.
-- This restores the two function bodies that are already applied in production
-- and drops the picture checks added by the repair. It does not delete books,
-- shelves, shares, or storage objects, and it does not change the access switch.

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

drop function if exists private.child_shelf_block_reason(uuid, jsonb);
drop function if exists private.child_picture_status(uuid, text);
