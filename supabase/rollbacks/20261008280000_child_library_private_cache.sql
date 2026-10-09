-- Restores the revoke and status functions from 20261008180000.
-- Drops the cache trigger. Does not set cacheControl back to a public max-age.
-- Does not delete child_library objects or change the access switches.

drop trigger if exists child_library_cache_on_content_close on private.child_access_control;

create or replace function public.revoke_child_device(p_device uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  device public.child_devices;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  select d.* into device
  from public.child_devices d
  join public.child_profiles c on c.id = d.child_profile_id
  where d.id = p_device
    and c.family_id = fam;
  if device.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if device.revoked_at is null then
    update public.child_devices
    set revoked_at = now()
    where id = device.id;
  end if;
  return jsonb_build_object('id', device.id, 'revoked', true);
end;
$$;

create or replace function public.set_child_status(p_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  row public.child_profiles;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  if p_status not in ('active', 'suspended') then
    raise exception 'status' using errcode = '22023';
  end if;
  perform private.purge_due_children();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  select * into row from public.child_profiles where id = p_id and family_id = fam;
  if row.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if row.status = 'pending_deletion' then
    raise exception 'pending_deletion' using errcode = '42501';
  end if;
  update public.child_profiles
  set status = p_status, updated_at = now()
  where id = p_id and family_id = fam;
  return public.family_snapshot();
end;
$$;

create or replace function public.request_child_deletion(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fam uuid;
  row public.child_profiles;
begin
  if auth.uid() is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  perform private.reject_child();
  perform private.purge_due_children();
  fam := private.current_family_id();
  if fam is null then
    raise exception 'no_family' using errcode = '42501';
  end if;
  select * into row from public.child_profiles where id = p_id and family_id = fam;
  if row.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if row.status <> 'pending_deletion' then
    update public.child_profiles
    set status = 'pending_deletion',
        deletion_requested_at = now(),
        purge_after = now() + interval '30 days',
        updated_at = now()
    where id = p_id and family_id = fam;
  end if;
  return public.family_snapshot();
end;
$$;

drop function if exists private.invalidate_child_library_on_content_close();
drop function if exists private.invalidate_child_library(uuid);
