/*
  Align storybook_room RLS with path {uuid}/storybook/shelf.json using split_part.
  Some deployments behave more reliably than storage.foldername(name)[1].
*/

drop policy if exists "storybook_room_select_own" on storage.objects;
drop policy if exists "storybook_room_insert_own" on storage.objects;
drop policy if exists "storybook_room_update_own" on storage.objects;
drop policy if exists "storybook_room_delete_own" on storage.objects;

create policy "storybook_room_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'storybook_room'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "storybook_room_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'storybook_room'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "storybook_room_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'storybook_room'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'storybook_room'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "storybook_room_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'storybook_room'
    and split_part(name, '/', 1) = auth.uid()::text
  );
