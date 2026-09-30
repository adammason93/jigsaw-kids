/*
  Join-by-code without opening school tables to anonymous pupils.
  Relationship triggers apply to every writer, including security-definer functions.
  Does not alter family tables or Morris and Son tables.
*/

alter table public.school_events
  add column participant_id uuid references public.school_participants (id) on delete set null;

create unique index school_sessions_code_key on public.school_sessions (upper(code));

create or replace function private.school_enforce_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_org uuid;
  parent_session uuid;
  pupil_class uuid;
  session_class uuid;
begin
  if tg_table_name = 'school_pupils' then
    select organisation_id into parent_org from public.school_classes where id = new.class_id;
    if parent_org is distinct from new.organisation_id then
      raise exception 'pupil organisation does not match class';
    end if;
  elsif tg_table_name = 'school_sessions' then
    if new.class_id is not null then
      select organisation_id into parent_org from public.school_classes where id = new.class_id;
      if parent_org is distinct from new.organisation_id then
        raise exception 'session organisation does not match class';
      end if;
    end if;
    if new.adventure_id is not null then
      select organisation_id into parent_org from public.school_adventures where id = new.adventure_id;
      if parent_org is distinct from new.organisation_id then
        raise exception 'session organisation does not match adventure';
      end if;
    end if;
  elsif tg_table_name = 'school_adventures' then
    if new.class_id is not null then
      select organisation_id into parent_org from public.school_classes where id = new.class_id;
      if parent_org is distinct from new.organisation_id then
        raise exception 'adventure organisation does not match class';
      end if;
    end if;
  elsif tg_table_name = 'school_teams' then
    select organisation_id into parent_org from public.school_sessions where id = new.session_id;
    if parent_org is distinct from new.organisation_id then
      raise exception 'team organisation does not match session';
    end if;
  elsif tg_table_name = 'school_participants' then
    select organisation_id into parent_org from public.school_sessions where id = new.session_id;
    if parent_org is distinct from new.organisation_id then
      raise exception 'participant organisation does not match session';
    end if;
    if new.pupil_id is not null then
      select organisation_id, class_id into parent_org, pupil_class from public.school_pupils where id = new.pupil_id;
      if parent_org is distinct from new.organisation_id then
        raise exception 'participant pupil is in another organisation';
      end if;
      select class_id into session_class from public.school_sessions where id = new.session_id;
      if session_class is not null and pupil_class is distinct from session_class then
        raise exception 'participant pupil is not in this class';
      end if;
    end if;
    if new.team_id is not null then
      select session_id into parent_session from public.school_teams where id = new.team_id;
      if parent_session is distinct from new.session_id then
        raise exception 'participant team is from another session';
      end if;
    end if;
  elsif tg_table_name = 'school_events' then
    select organisation_id into parent_org from public.school_sessions where id = new.session_id;
    if parent_org is distinct from new.organisation_id then
      raise exception 'event organisation does not match session';
    end if;
    if new.pupil_id is not null then
      select organisation_id, class_id into parent_org, pupil_class from public.school_pupils where id = new.pupil_id;
      if parent_org is distinct from new.organisation_id then
        raise exception 'event pupil is in another organisation';
      end if;
      select class_id into session_class from public.school_sessions where id = new.session_id;
      if session_class is not null and pupil_class is distinct from session_class then
        raise exception 'event pupil is not in this class';
      end if;
    end if;
    if new.class_id is not null then
      select organisation_id into parent_org from public.school_classes where id = new.class_id;
      if parent_org is distinct from new.organisation_id then
        raise exception 'event class is in another organisation';
      end if;
    end if;
    if new.adventure_id is not null then
      select organisation_id into parent_org from public.school_adventures where id = new.adventure_id;
      if parent_org is distinct from new.organisation_id then
        raise exception 'event adventure is in another organisation';
      end if;
    end if;
    if new.team_id is not null then
      select session_id into parent_session from public.school_teams where id = new.team_id;
      if parent_session is distinct from new.session_id then
        raise exception 'event team is from another session';
      end if;
    end if;
    if new.participant_id is not null then
      select session_id into parent_session from public.school_participants where id = new.participant_id;
      if parent_session is distinct from new.session_id then
        raise exception 'event participant is from another session';
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.school_enforce_links() from public, anon, authenticated;

create trigger school_pupils_links before insert or update on public.school_pupils
  for each row execute function private.school_enforce_links();
create trigger school_adventures_links before insert or update on public.school_adventures
  for each row execute function private.school_enforce_links();
create trigger school_sessions_links before insert or update on public.school_sessions
  for each row execute function private.school_enforce_links();
create trigger school_teams_links before insert or update on public.school_teams
  for each row execute function private.school_enforce_links();
create trigger school_participants_links before insert or update on public.school_participants
  for each row execute function private.school_enforce_links();
create trigger school_events_links before insert or update on public.school_events
  for each row execute function private.school_enforce_links();

create or replace function private.school_join_view(s public.school_sessions)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  snap jsonb := coalesce(s.snapshot, '{}'::jsonb);
  slides jsonb := coalesce(snap->'slides', '[]'::jsonb);
  slide jsonb;
  question jsonb := null;
  choices jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(slides) = 'array' and jsonb_array_length(slides) > 0 then
    slide := slides->least(greatest(s.slide_index, 0), jsonb_array_length(slides) - 1);
  end if;
  if slide is not null and slide->>'type' = 'question' and s.phase <> 'reveal' and coalesce((snap->>'reveal')::boolean, false) = false then
    select coalesce(jsonb_agg(jsonb_build_object('id', c->>'id', 'text', c->>'text')), '[]'::jsonb)
      into choices
      from jsonb_array_elements(coalesce(slide->'question'->'choices', '[]'::jsonb)) c;
    question := jsonb_build_object('prompt', coalesce(slide->'question'->>'prompt', ''), 'choices', choices);
  end if;
  return jsonb_build_object(
    'code', s.code,
    'title', coalesce(snap->>'title', 'Your adventure'),
    'status', s.status,
    'phase', s.phase,
    'slide', s.slide_index,
    'reveal', coalesce((snap->>'reveal')::boolean, false),
    'groupCount', coalesce((snap->>'groupCount')::int, 0),
    'question', question,
    'explain', case
      when coalesce((snap->>'reveal')::boolean, false) and slide is not null
      then slide->'question'->>'explain'
      else null
    end
  );
end;
$$;

revoke all on function private.school_join_view(public.school_sessions) from public, anon, authenticated;

create or replace function private.school_join_lookup(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.school_sessions%rowtype;
  normalised text := upper(btrim(coalesce(p_code, '')));
begin
  if normalised !~ '^[A-Z2-9-]{4,12}$' then
    return null;
  end if;
  select * into s from public.school_sessions where upper(code) = normalised;
  if not found then
    return null;
  end if;
  return private.school_join_view(s);
end;
$$;

create or replace function private.school_join(p_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.school_sessions%rowtype;
  normalised text := upper(btrim(coalesce(p_code, '')));
  display text;
  person uuid;
begin
  if normalised !~ '^[A-Z2-9-]{4,12}$' then
    return jsonb_build_object('error', 'That code is not open. Check it with your teacher.');
  end if;
  select * into s from public.school_sessions where upper(code) = normalised;
  if not found or s.status <> 'waiting' then
    return jsonb_build_object('error', 'That code is not open. Check it with your teacher.');
  end if;
  display := left(regexp_replace(coalesce(p_name, ''), '[^A-Za-z ''-]', '', 'g'), 40);
  display := btrim(split_part(display, ' ', 1));
  if char_length(display) < 2 then
    display := 'Explorer';
  end if;
  insert into public.school_participants (organisation_id, session_id, display_name, kind)
  values (s.organisation_id, s.id, display, 'pupil')
  returning id into person;
  return jsonb_build_object('participantId', person, 'name', display, 'session', private.school_join_view(s));
end;
$$;

create or replace function private.school_join_answer(p_code text, p_participant uuid, p_choice text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.school_sessions%rowtype;
  person public.school_participants%rowtype;
  normalised text := upper(btrim(coalesce(p_code, '')));
  choice text := upper(btrim(coalesce(p_choice, '')));
begin
  if choice not in ('A', 'B', 'C') then
    return jsonb_build_object('error', 'Choose A, B or C.');
  end if;
  select * into s from public.school_sessions where upper(code) = normalised;
  if not found then
    return jsonb_build_object('error', 'That code is not open. Check it with your teacher.');
  end if;
  select * into person from public.school_participants where id = p_participant and session_id = s.id;
  if not found then
    return jsonb_build_object('error', 'Join again with your class code.');
  end if;
  insert into public.school_events (
    organisation_id, session_id, class_id, adventure_id, scope, participant_id, mechanic, result, points, demo
  ) values (
    s.organisation_id, s.id, s.class_id, s.adventure_id, 'class', person.id, 'question', choice, 0, false
  );
  return jsonb_build_object('ok', true, 'session', private.school_join_view(s));
end;
$$;

revoke all on function private.school_join_lookup(text) from public, anon, authenticated;
revoke all on function private.school_join(text, text) from public, anon, authenticated;
revoke all on function private.school_join_answer(text, uuid, text) from public, anon, authenticated;

revoke all on function private.add_organisation_owner() from public, anon;
revoke all on function private.touch_organisation() from public, anon;

create or replace function public.school_join_lookup(p_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select private.school_join_lookup(p_code);
$$;

create or replace function public.school_join(p_code text, p_name text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select private.school_join(p_code, p_name);
$$;

create or replace function public.school_join_answer(p_code text, p_participant uuid, p_choice text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select private.school_join_answer(p_code, p_participant, p_choice);
$$;

revoke all on function public.school_join_lookup(text) from public;
revoke all on function public.school_join(text, text) from public;
revoke all on function public.school_join_answer(text, uuid, text) from public;
grant execute on function public.school_join_lookup(text) to anon, authenticated;
grant execute on function public.school_join(text, text) to anon, authenticated;
grant execute on function public.school_join_answer(text, uuid, text) to anon, authenticated;
