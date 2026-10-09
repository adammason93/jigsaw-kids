-- Restores direct child_library reads. Do not apply this while a cached
-- storage response can still be replayed. Prefer leaving the policies dropped
-- and serving artwork through child-art.

create policy "child_library_child_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'child_library'
    and split_part(name, '/', 1) = private.session_child_folder()
    and (
      split_part(name, '/', 2) in ('books', 'characters')
      or (
        split_part(name, '/', 2) = 'shared'
        and private.child_share_visible(split_part(name, '/', 3))
      )
    )
  );

create policy "child_library_parent_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'child_library'
    and private.parent_owns_child_folder(split_part(name, '/', 1))
  );
