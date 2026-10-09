-- Emergency switch for child pairing and child content.
-- Apply after 20261008240000. Do not apply until the release window is approved.
-- Turning the flags off does not delete profiles, devices, shelves, books, characters, or storage objects.

create table if not exists private.child_access_control (
  singleton boolean primary key default true check (singleton),
  pairing_enabled boolean not null default true,
  content_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into private.child_access_control (singleton)
values (true)
on conflict (singleton) do nothing;

revoke all on table private.child_access_control from public, anon, authenticated;

create or replace function private.child_access_open(p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case p_kind
      when 'pairing' then pairing_enabled
      when 'content' then content_enabled
      else false
    end
    from private.child_access_control
    where singleton
  ), false);
$$;

revoke all on function private.child_access_open(text) from public, anon, authenticated;

create or replace function public.child_content_access()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  device public.child_devices;
  profile public.child_profiles;
begin
  if private.child_access_open('content') is not true then
    return jsonb_build_object('allowed', false, 'reason', 'unavailable');
  end if;
  if auth.uid() is null or not private.is_child() then
    return jsonb_build_object('allowed', false, 'reason', 'not_child');
  end if;
  select * into device
  from public.child_devices
  where auth_user_id = auth.uid();
  if device.id is null or device.revoked_at is not null then
    return jsonb_build_object('allowed', false, 'reason', 'device_revoked');
  end if;
  select * into profile
  from public.child_profiles
  where id = device.child_profile_id;
  if profile.id is null or profile.status <> 'active' then
    return jsonb_build_object('allowed', false, 'reason', 'profile_unavailable');
  end if;
  return jsonb_build_object('allowed', true, 'childId', profile.id);
end;
$$;

create or replace function public.create_child_pairing(p_child uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fam uuid;
  profile public.child_profiles;
  raw_code text := '';
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
  expires_at timestamptz := now() + interval '10 minutes';
begin
  if private.child_access_open('pairing') is not true then
    raise exception 'pairing_unavailable' using errcode = '42501';
  end if;
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  select * into profile
  from public.child_profiles
  where id = p_child
    and family_id = fam;
  if profile.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if profile.status <> 'active' then
    raise exception 'profile_unavailable' using errcode = '42501';
  end if;
  if (
    select count(*)
    from private.child_pairing_tickets
    where created_by = auth.uid()
      and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'pairing_limited' using errcode = '42501';
  end if;

  update private.child_pairing_tickets
  set redeemed_at = now()
  where child_profile_id = profile.id
    and redeemed_at is null;

  for i in 1..8 loop
    raw_code := raw_code || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 32), 1);
  end loop;

  insert into private.child_pairing_tickets (child_profile_id, code_hash, expires_at, created_by)
  values (
    profile.id,
    encode(extensions.digest(raw_code, 'sha256'), 'hex'),
    expires_at,
    auth.uid()
  );

  return jsonb_build_object(
    'code', raw_code,
    'expiresAt', expires_at,
    'childId', profile.id
  );
end;
$$;

create or replace function public.consume_child_pairing(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  clean text := upper(btrim(coalesce(p_code, '')));
  ticket private.child_pairing_tickets;
  profile public.child_profiles;
begin
  if private.child_access_open('pairing') is not true then
    return jsonb_build_object('allowed', false, 'reason', 'unavailable');
  end if;
  if clean !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then
    return jsonb_build_object('allowed', false, 'reason', 'invalid');
  end if;

  select * into ticket
  from private.child_pairing_tickets
  where code_hash = encode(extensions.digest(clean, 'sha256'), 'hex')
    and redeemed_at is null
    and expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'invalid');
  end if;

  update private.child_pairing_tickets
  set redeemed_at = now()
  where id = ticket.id
    and redeemed_at is null;

  select * into profile
  from public.child_profiles
  where id = ticket.child_profile_id;

  if profile.id is null or profile.status <> 'active' then
    return jsonb_build_object('allowed', false, 'reason', 'profile_unavailable');
  end if;

  return jsonb_build_object(
    'allowed', true,
    'childId', profile.id,
    'ticketId', ticket.id
  );
end;
$$;

create or replace function public.register_child_device(p_child uuid, p_auth_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.child_profiles;
  created uuid;
begin
  if private.child_access_open('pairing') is not true then
    raise exception 'pairing_unavailable' using errcode = '42501';
  end if;
  select * into profile
  from public.child_profiles
  where id = p_child
    and status = 'active';
  if profile.id is null then
    raise exception 'profile_unavailable' using errcode = '42501';
  end if;
  insert into public.child_devices (child_profile_id, auth_user_id)
  values (profile.id, p_auth_user)
  returning id into created;
  return created;
end;
$$;

revoke all on function public.child_content_access() from public, anon;
grant execute on function public.child_content_access() to authenticated;
revoke all on function public.consume_child_pairing(text) from public, anon, authenticated;
grant execute on function public.consume_child_pairing(text) to service_role;
revoke all on function public.register_child_device(uuid, uuid) from public, anon, authenticated;
grant execute on function public.register_child_device(uuid, uuid) to service_role;

comment on table private.child_access_control is
  'Singleton emergency switch. Set pairing_enabled and content_enabled to false to stop new pairing and block child sessions from protected data. Rows and storage objects stay.';
