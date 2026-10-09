-- Stop Supabase Smart CDN from replaying private child files after access ends.
-- cacheControl "0" is stored as max-age=0 and served as public, max-age=0.
-- Cloudflare can HIT that response without asking storage RLS again.
-- This file does not enable pairing or child content, and it does not delete objects.
-- Applying it marks current child_library rows. Rewriting the object bytes is a
-- separate approved step so the origin header becomes private, no-store.

create or replace function private.invalidate_child_library(p_child uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update storage.objects
  set updated_at = now(),
      metadata = jsonb_set(
        coalesce(metadata, '{}'::jsonb),
        '{cacheControl}',
        '"private, no-store"'::jsonb,
        true
      )
  where bucket_id = 'child_library'
    and (
      p_child is null
      or split_part(name, '/', 1) = p_child::text
    );
end;
$$;

revoke all on function private.invalidate_child_library(uuid) from public, anon, authenticated;

create or replace function private.invalidate_child_library_on_content_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.content_enabled is false and old.content_enabled is distinct from false then
    perform private.invalidate_child_library(null);
  end if;
  return new;
end;
$$;

revoke all on function private.invalidate_child_library_on_content_close() from public, anon, authenticated;

drop trigger if exists child_library_cache_on_content_close on private.child_access_control;
create trigger child_library_cache_on_content_close
  after update of content_enabled on private.child_access_control
  for each row
  execute function private.invalidate_child_library_on_content_close();

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
  perform private.invalidate_child_library(device.child_profile_id);
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
  if p_status <> 'active' then
    perform private.invalidate_child_library(p_id);
  end if;
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
  perform private.invalidate_child_library(p_id);
  return public.family_snapshot();
end;
$$;

revoke all on function public.revoke_child_device(uuid) from public, anon;
revoke all on function public.set_child_status(uuid, text) from public, anon;
revoke all on function public.request_child_deletion(uuid) from public, anon;
grant execute on function public.revoke_child_device(uuid) to authenticated;
grant execute on function public.set_child_status(uuid, text) to authenticated;
grant execute on function public.request_child_deletion(uuid) to authenticated;

select private.invalidate_child_library(null);
