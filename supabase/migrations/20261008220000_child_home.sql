-- Signed-in child home. Apply only after 20261008210000_child_pairing.sql.
-- A child session can read its own profile. It cannot read another child.
-- Books and characters are empty until a child-owned library is added.
-- This file is not applied to the hosted database yet.

create or replace function public.child_home()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  access jsonb;
  profile public.child_profiles;
begin
  access := public.child_content_access();
  if coalesce(access ->> 'allowed', '') <> 'true' then
    return access;
  end if;
  select * into profile
  from public.child_profiles
  where id = (access ->> 'childId')::uuid
    and status = 'active';
  if profile.id is null then
    return jsonb_build_object('allowed', false, 'reason', 'profile_unavailable');
  end if;
  return jsonb_build_object(
    'allowed', true,
    'nickname', profile.nickname,
    'avatarId', profile.avatar_id,
    'ageBand', profile.age_band,
    'booksPerDay', profile.books_per_day,
    'charactersPerDay', profile.characters_per_day,
    'canPlayGames', profile.can_play_games,
    'books', '[]'::jsonb,
    'characters', '[]'::jsonb,
    'sharedBooks', '[]'::jsonb,
    'sharedCharacters', '[]'::jsonb
  );
end;
$$;

revoke all on function public.child_home() from public, anon, authenticated;
grant execute on function public.child_home() to authenticated;

comment on function public.child_home() is
  'Own profile only, after the device and profile are still active. No other child and no family list.';
