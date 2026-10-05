/*
  Private bucket for newly generated story illustrations.
  Path: {user uuid}/storybook/{file}.png
  split_part is used on purpose — storage.foldername proved unreliable
  (see 20260430120000_storybook_room_rls_split_part.sql).

  The old public bucket storybook_images is left as-is. Do not delete its
  objects from this migration.
*/

insert into storage.buckets (id, name, public)
values ('storybook_images_private', 'storybook_images_private', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "storybook_images_private_select_own" on storage.objects;
drop policy if exists "storybook_images_private_insert_own" on storage.objects;
drop policy if exists "storybook_images_private_update_own" on storage.objects;
drop policy if exists "storybook_images_private_delete_own" on storage.objects;

create policy "storybook_images_private_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'storybook_images_private'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "storybook_images_private_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'storybook_images_private'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "storybook_images_private_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'storybook_images_private'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'storybook_images_private'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "storybook_images_private_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'storybook_images_private'
    and split_part(name, '/', 1) = auth.uid()::text
  );
