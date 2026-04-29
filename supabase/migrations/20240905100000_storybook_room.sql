/*
  Storybook-room session snapshot (same JSON as localStorage jigsawKids_storybookShelf_v1).
  Path: {user uuid}/storybook/shelf.json in private bucket storybook_room.
*/

insert into storage.buckets (id, name, public)
values ('storybook_room', 'storybook_room', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "storybook_room_select_own" on storage.objects;
drop policy if exists "storybook_room_insert_own" on storage.objects;
drop policy if exists "storybook_room_update_own" on storage.objects;
drop policy if exists "storybook_room_delete_own" on storage.objects;

create policy "storybook_room_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'storybook_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "storybook_room_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'storybook_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "storybook_room_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'storybook_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'storybook_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "storybook_room_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'storybook_room'
    and (storage.foldername (name))[1] = auth.uid()::text
  );
