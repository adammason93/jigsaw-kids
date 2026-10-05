/*
  Optional school organisations. Existing users stay organisation-free.
  Does not alter score_bundles, story jobs, or Morris and Son tables.

  Privileged checks live in schema private (not exposed by the Data API).
  public wrappers are security invoker so the API can call them.
*/

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  short_name text not null default '',
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  type text not null default 'school' check (type = 'school'),
  logo_url text,
  primary_colour text not null default '#141b4d' check (primary_colour ~ '^#[0-9a-f]{6}$'),
  secondary_colour text not null default '#141b4d' check (secondary_colour ~ '^#[0-9a-f]{6}$'),
  website_url text,
  hero_image_url text,
  sidebar_image_url text,
  portal_title text,
  portal_subtitle text,
  join_code text unique,
  is_active boolean not null default true,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null default '',
  role text not null check (role in ('owner', 'school_admin', 'teacher', 'staff')),
  status text not null check (status in ('invited', 'active', 'suspended')),
  joined_at timestamptz,
  unique (organisation_id, user_id)
);

create table public.organisation_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  email text not null,
  role text not null check (role in ('school_admin', 'teacher', 'staff')),
  status text not null default 'invited' check (status in ('invited', 'accepted', 'revoked')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users (id),
  expires_at timestamptz not null,
  accepted_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.organisation_story_starters (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text not null default '',
  icon text not null default '',
  prompt_seed text not null default '',
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.organisation_navigation (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 40),
  icon text not null default '',
  href text not null check (href ~ '^(#|\\./|games/)'),
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create index organisation_members_user_idx on public.organisation_members (user_id);
create index organisation_members_org_idx on public.organisation_members (organisation_id);
create index organisation_invites_org_idx on public.organisation_invites (organisation_id);

alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.organisation_invites enable row level security;
alter table public.organisation_story_starters enable row level security;
alter table public.organisation_navigation enable row level security;

revoke all on public.organisations from anon, authenticated;
revoke all on public.organisation_members from anon, authenticated;
revoke all on public.organisation_invites from anon, authenticated;
revoke all on public.organisation_story_starters from anon, authenticated;
revoke all on public.organisation_navigation from anon, authenticated;

grant select, update on public.organisations to authenticated;
grant select on public.organisation_members to authenticated;
grant select on public.organisation_invites to authenticated;
grant select, insert, update, delete on public.organisation_story_starters to authenticated;
grant select, insert, update, delete on public.organisation_navigation to authenticated;

create or replace function private.org_role(org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organisation_members m
  join public.organisations o on o.id = m.organisation_id
  where m.organisation_id = org
    and m.user_id = auth.uid()
    and m.status = 'active'
    and o.is_active
  limit 1;
$$;

create or replace function private.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.org_role(org) is not null;
$$;

create or replace function private.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.org_role(org) in ('owner', 'school_admin');
$$;

revoke all on function private.org_role(uuid) from public, anon, authenticated;
revoke all on function private.is_org_member(uuid) from public, anon, authenticated;
revoke all on function private.is_org_admin(uuid) from public, anon, authenticated;
grant execute on function private.org_role(uuid) to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;

create policy organisations_select_member
  on public.organisations
  for select
  to authenticated
  using (private.is_org_member(id));

create policy organisations_update_admin
  on public.organisations
  for update
  to authenticated
  using (private.is_org_admin(id))
  with check (private.is_org_admin(id));

create policy organisation_members_select
  on public.organisation_members
  for select
  to authenticated
  using (private.is_org_member(organisation_id) or user_id = auth.uid());

create policy organisation_invites_select_admin
  on public.organisation_invites
  for select
  to authenticated
  using (private.is_org_admin(organisation_id));

create policy organisation_starters_select
  on public.organisation_story_starters
  for select
  to authenticated
  using (
    private.is_org_admin(organisation_id)
    or (is_active and private.is_org_member(organisation_id))
  );

create policy organisation_starters_write
  on public.organisation_story_starters
  for all
  to authenticated
  using (private.is_org_admin(organisation_id))
  with check (private.is_org_admin(organisation_id));

create policy organisation_nav_select
  on public.organisation_navigation
  for select
  to authenticated
  using (
    private.is_org_admin(organisation_id)
    or (is_active and private.is_org_member(organisation_id))
  );

create policy organisation_nav_write
  on public.organisation_navigation
  for all
  to authenticated
  using (private.is_org_admin(organisation_id))
  with check (private.is_org_admin(organisation_id));

create or replace function private.add_organisation_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organisation_members (organisation_id, user_id, email, role, status, joined_at)
  values (
    new.id,
    new.created_by,
    lower(coalesce(auth.jwt() ->> 'email', '')),
    'owner',
    'active',
    now()
  );
  return new;
end;
$$;

create trigger organisations_add_owner
  after insert on public.organisations
  for each row
  execute function private.add_organisation_owner();

create or replace function private.touch_organisation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organisations_touch
  before update on public.organisations
  for each row
  execute function private.touch_organisation();

create or replace function private.create_organisation(
  p_name text,
  p_short_name text,
  p_primary_colour text,
  p_website text
)
returns public.organisations
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  base text;
  chosen text;
  n int := 0;
  created public.organisations;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_primary_colour !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'invalid_colour';
  end if;
  base := trim(both '-' from regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if base is null or base = '' then
    base := 'school';
  end if;
  chosen := base;
  while exists (select 1 from public.organisations o where o.slug = chosen) loop
    n := n + 1;
    chosen := base || '-' || n::text;
  end loop;
  insert into public.organisations (
    name, short_name, slug, primary_colour, secondary_colour, website_url, portal_title, portal_subtitle, created_by
  )
  values (
    btrim(p_name),
    coalesce(nullif(btrim(coalesce(p_short_name, '')), ''), split_part(btrim(p_name), ' ', 1)),
    chosen,
    lower(p_primary_colour),
    '#141b4d',
    nullif(btrim(coalesce(p_website, '')), ''),
    btrim(p_name),
    'Turn your school, your ideas and the curriculum into personalised stories that inspire a love of reading and learning.',
    uid
  )
  returning * into created;
  return created;
end;
$$;

create or replace function private.create_organisation_invite(p_org uuid, p_email text, p_role text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  raw_token text;
  clean_email text := lower(btrim(p_email));
begin
  if not private.is_org_admin(p_org) then
    raise exception 'not_allowed';
  end if;
  if p_role not in ('school_admin', 'teacher', 'staff') then
    raise exception 'invalid_role';
  end if;
  if clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;
  raw_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.organisation_invites (organisation_id, email, role, token_hash, invited_by, expires_at)
  values (
    p_org,
    clean_email,
    p_role,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    auth.uid(),
    now() + interval '14 days'
  );
  return raw_token;
end;
$$;

create or replace function private.accept_organisation_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  invite public.organisation_invites;
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into invite
  from public.organisation_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and status = 'invited'
    and expires_at > now();
  if invite.id is null then
    raise exception 'invite_invalid';
  end if;
  if caller_email = '' or caller_email <> invite.email then
    raise exception 'email_mismatch';
  end if;
  insert into public.organisation_members (organisation_id, user_id, email, role, status, joined_at)
  values (invite.organisation_id, uid, caller_email, invite.role, 'active', now())
  on conflict (organisation_id, user_id) do update
    set status = 'active',
        email = excluded.email,
        joined_at = coalesce(public.organisation_members.joined_at, now()),
        role = case
          when public.organisation_members.role = 'owner' then 'owner'
          else excluded.role
        end;
  update public.organisation_invites
    set status = 'accepted', accepted_by = uid
    where id = invite.id;
  return invite.organisation_id;
end;
$$;

create or replace function private.set_organisation_member_role(p_member uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member public.organisation_members;
  owners int;
begin
  select * into member from public.organisation_members where id = p_member;
  if member.id is null or not private.is_org_admin(member.organisation_id) then
    raise exception 'not_allowed';
  end if;
  if p_role not in ('school_admin', 'teacher', 'staff') then
    raise exception 'invalid_role';
  end if;
  if member.role = 'owner' then
    select count(*) into owners
    from public.organisation_members
    where organisation_id = member.organisation_id and role = 'owner' and status = 'active';
    if owners <= 1 then
      raise exception 'last_owner';
    end if;
  end if;
  update public.organisation_members set role = p_role where id = member.id;
end;
$$;

create or replace function private.remove_organisation_member(p_member uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member public.organisation_members;
  owners int;
begin
  select * into member from public.organisation_members where id = p_member;
  if member.id is null or not private.is_org_admin(member.organisation_id) then
    raise exception 'not_allowed';
  end if;
  if member.role = 'owner' then
    select count(*) into owners
    from public.organisation_members
    where organisation_id = member.organisation_id and role = 'owner' and status = 'active';
    if owners <= 1 then
      raise exception 'last_owner';
    end if;
  end if;
  delete from public.organisation_members where id = member.id;
end;
$$;

create or replace function private.revoke_organisation_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  select organisation_id into org from public.organisation_invites where id = p_invite;
  if org is null or not private.is_org_admin(org) then
    raise exception 'not_allowed';
  end if;
  update public.organisation_invites set status = 'revoked' where id = p_invite and status = 'invited';
end;
$$;

revoke all on function private.create_organisation(text, text, text, text) from public, anon;
revoke all on function private.create_organisation_invite(uuid, text, text) from public, anon;
revoke all on function private.accept_organisation_invite(text) from public, anon;
revoke all on function private.set_organisation_member_role(uuid, text) from public, anon;
revoke all on function private.remove_organisation_member(uuid) from public, anon;
revoke all on function private.revoke_organisation_invite(uuid) from public, anon;
grant execute on function private.create_organisation(text, text, text, text) to authenticated;
grant execute on function private.create_organisation_invite(uuid, text, text) to authenticated;
grant execute on function private.accept_organisation_invite(text) to authenticated;
grant execute on function private.set_organisation_member_role(uuid, text) to authenticated;
grant execute on function private.remove_organisation_member(uuid) to authenticated;
grant execute on function private.revoke_organisation_invite(uuid) to authenticated;

create or replace function public.create_organisation(p_name text, p_short_name text, p_primary_colour text, p_website text)
returns public.organisations
language sql
security invoker
set search_path = public
as $$
  select private.create_organisation(p_name, p_short_name, p_primary_colour, p_website);
$$;

create or replace function public.create_organisation_invite(p_org uuid, p_email text, p_role text)
returns text
language sql
security invoker
set search_path = public
as $$
  select private.create_organisation_invite(p_org, p_email, p_role);
$$;

create or replace function public.accept_organisation_invite(p_token text)
returns uuid
language sql
security invoker
set search_path = public
as $$
  select private.accept_organisation_invite(p_token);
$$;

create or replace function public.set_organisation_member_role(p_member uuid, p_role text)
returns void
language sql
security invoker
set search_path = public
as $$
  select private.set_organisation_member_role(p_member, p_role);
$$;

create or replace function public.remove_organisation_member(p_member uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  select private.remove_organisation_member(p_member);
$$;

create or replace function public.revoke_organisation_invite(p_invite uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  select private.revoke_organisation_invite(p_invite);
$$;

revoke all on function public.create_organisation(text, text, text, text) from public, anon;
revoke all on function public.create_organisation_invite(uuid, text, text) from public, anon;
revoke all on function public.accept_organisation_invite(text) from public, anon;
revoke all on function public.set_organisation_member_role(uuid, text) from public, anon;
revoke all on function public.remove_organisation_member(uuid) from public, anon;
revoke all on function public.revoke_organisation_invite(uuid) from public, anon;
grant execute on function public.create_organisation(text, text, text, text) to authenticated;
grant execute on function public.create_organisation_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_organisation_invite(text) to authenticated;
grant execute on function public.set_organisation_member_role(uuid, text) to authenticated;
grant execute on function public.remove_organisation_member(uuid) to authenticated;
grant execute on function public.revoke_organisation_invite(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organisation_branding',
  'organisation_branding',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists organisation_branding_read on storage.objects;
drop policy if exists organisation_branding_insert on storage.objects;
drop policy if exists organisation_branding_update on storage.objects;
drop policy if exists organisation_branding_delete on storage.objects;

create policy organisation_branding_read
  on storage.objects for select
  to public
  using (bucket_id = 'organisation_branding');

create policy organisation_branding_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'organisation_branding'
    and (storage.foldername(name))[2] = 'branding'
    and private.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy organisation_branding_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'organisation_branding'
    and private.is_org_admin(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'organisation_branding'
    and (storage.foldername(name))[2] = 'branding'
    and private.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy organisation_branding_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'organisation_branding'
    and private.is_org_admin(((storage.foldername(name))[1])::uuid)
  );
