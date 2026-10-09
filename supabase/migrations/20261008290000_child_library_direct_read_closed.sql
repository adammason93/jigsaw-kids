-- Close direct browser reads of child_library.
-- Do not apply until supabase/functions/child-art is deployed.
-- Applying it earlier makes storage reads fail closed. It does not delete,
-- overwrite, or change the cache header of any object.
-- Insert, update, and delete policies stay, so uploads and unshare cleanup stay.
-- Adult storybook_room and characters_room policies are not changed.
-- Parent management reads move to child-art, which uses the same ownership
-- check and does not require the child content switch.

drop policy if exists "child_library_child_read" on storage.objects;
drop policy if exists "child_library_parent_read" on storage.objects;
