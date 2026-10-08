/*
  School character libraries share the existing private bucket characters_room.

  Family / personal records stay where they already are:
    {user uuid}/characters/index.json
    {user uuid}/characters/{id}.png

  School records are a separate prefix, readable and writable only by active
  members of that organisation:
    school/{organisation uuid}/characters/index.json
    school/{organisation uuid}/characters/{id}.png

  Existing user-folder objects are not moved or deleted.
*/

create or replace function private.storage_school_id(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  org_key text;
begin
  /* split_part is the reliable form. storage.foldername has disagreed with
     the real path on this project before. */
  if split_part(object_name, '/', 1) is distinct from 'school' then
    return null;
  end if;
  if split_part(object_name, '/', 3) is distinct from 'characters' then
    return null;
  end if;
  org_key := split_part(object_name, '/', 2);
  if org_key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return org_key::uuid;
end;
$$;

revoke all on function private.storage_school_id(text) from public, anon, authenticated;
grant execute on function private.storage_school_id(text) to authenticated;

drop policy if exists "characters_room_select_school" on storage.objects;
drop policy if exists "characters_room_insert_school" on storage.objects;
drop policy if exists "characters_room_update_school" on storage.objects;
drop policy if exists "characters_room_delete_school" on storage.objects;

create policy "characters_room_select_school"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'characters_room'
    and private.is_org_member(private.storage_school_id(name))
  );

create policy "characters_room_insert_school"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'characters_room'
    and private.is_org_member(private.storage_school_id(name))
  );

create policy "characters_room_update_school"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'characters_room'
    and private.is_org_member(private.storage_school_id(name))
  )
  with check (
    bucket_id = 'characters_room'
    and private.is_org_member(private.storage_school_id(name))
  );

create policy "characters_room_delete_school"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'characters_room'
    and private.is_org_member(private.storage_school_id(name))
  );
