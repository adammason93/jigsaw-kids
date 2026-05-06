/*
  Per-user character library: cartoon portraits + metadata index.
  Path layout in the private bucket characters_room:
    {user uuid}/characters/index.json    — metadata array (id, name, type, createdAt)
    {user uuid}/characters/{id}.png      — generated 3D-clay cartoon PNG
*/

insert into storage.buckets (id, name, public)
values ('characters_room', 'characters_room', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "characters_room_select_own" on storage.objects;
drop policy if exists "characters_room_insert_own" on storage.objects;
drop policy if exists "characters_room_update_own" on storage.objects;
drop policy if exists "characters_room_delete_own" on storage.objects;

create policy "characters_room_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'characters_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "characters_room_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'characters_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "characters_room_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'characters_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'characters_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "characters_room_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'characters_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );
