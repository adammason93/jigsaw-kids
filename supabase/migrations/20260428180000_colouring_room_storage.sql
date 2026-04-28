/*
  Colouring-book session snapshot (same JSON as localStorage jigsawKidsColouringV1).
  Path: {user uuid}/colouring/session.json in private bucket colouring_room.
*/

insert into storage.buckets (id, name, public)
values ('colouring_room', 'colouring_room', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "colouring_room_select_own" on storage.objects;
drop policy if exists "colouring_room_insert_own" on storage.objects;
drop policy if exists "colouring_room_update_own" on storage.objects;
drop policy if exists "colouring_room_delete_own" on storage.objects;

create policy "colouring_room_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'colouring_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "colouring_room_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'colouring_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "colouring_room_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'colouring_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'colouring_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "colouring_room_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'colouring_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );
