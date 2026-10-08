-- Child device pairing. Apply only after 20261008180000_job_keys_and_child_guards.sql.
-- A parent can mint a short-lived code. Only the service role can redeem it.
-- Redeeming does not run from the browser and does not put a service key in the client.

create table private.child_pairing_tickets (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references public.child_profiles (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index child_pairing_tickets_child_idx
  on private.child_pairing_tickets (child_profile_id);

revoke all on private.child_pairing_tickets from public, anon, authenticated;

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

create or replace function public.list_child_devices(p_child uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.child_profiles
    where id = p_child and family_id = fam
  ) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id,
      'createdAt', d.created_at,
      'revokedAt', d.revoked_at
    ) order by d.created_at desc)
    from public.child_devices d
    where d.child_profile_id = p_child
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.create_child_pairing(uuid) from public, anon, authenticated;
revoke all on function public.consume_child_pairing(text) from public, anon, authenticated;
revoke all on function public.register_child_device(uuid, uuid) from public, anon, authenticated;
revoke all on function public.list_child_devices(uuid) from public, anon, authenticated;

grant execute on function public.create_child_pairing(uuid) to authenticated;
grant execute on function public.list_child_devices(uuid) to authenticated;
grant execute on function public.consume_child_pairing(text) to service_role;
grant execute on function public.register_child_device(uuid, uuid) to service_role;

comment on function public.create_child_pairing(uuid) is
  'Parent-only. Returns a single-use code once. Previous unused codes for that child are marked used.';
comment on function public.consume_child_pairing(text) is
  'Service role only. Marks one live code used. Wrong, expired and reused codes all return invalid.';
