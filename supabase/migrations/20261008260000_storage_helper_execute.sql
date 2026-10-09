-- Let signed-in adults pass storage policy checks again.
-- Apply after 20261008250000. Do not apply until this repair is approved.
-- 20261008240000 revoked EXECUTE on the child-library helpers, then called them
-- from permissive policies on storage.objects. PostgreSQL evaluates those
-- policies for every storage query, so a missing EXECUTE aborts adult reads
-- of storybook_room and characters_room as well.
-- This file does not replace those policies and does not change the access switch.

grant execute on function private.session_child_folder() to authenticated;
grant execute on function private.parent_owns_child_folder(text) to authenticated;
grant execute on function private.child_share_visible(text) to authenticated;

-- Rollback, if this grant must be removed:
-- revoke execute on function private.session_child_folder() from authenticated;
-- revoke execute on function private.parent_owns_child_folder(text) from authenticated;
-- revoke execute on function private.child_share_visible(text) from authenticated;
