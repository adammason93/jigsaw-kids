-- The character list was answering not_child whenever a paired child was refused.
-- session_child_id() returns null for a closed content switch, a stopped device,
-- and a paused profile, so the list could not tell those apart.
-- This returns the same child_content_access decision the rest of the child
-- library already uses. It does not grant a new reader.

create or replace function public.child_characters()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  access jsonb := public.child_content_access();
  cid uuid;
  stored jsonb;
begin
  if coalesce(access ->> 'allowed', '') <> 'true' then
    return access;
  end if;
  cid := (access ->> 'childId')::uuid;
  select items into stored from private.child_character_indexes where child_profile_id = cid;
  return jsonb_build_object('allowed', true, 'characters', coalesce(stored, '[]'::jsonb));
end;
$$;

revoke all on function public.child_characters() from public, anon;
grant execute on function public.child_characters() to authenticated;
