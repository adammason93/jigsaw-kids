/*
  FOUNDER APPROVAL REQUIRED. DO NOT RUN as part of `supabase db push`.
  This file is not in supabase/migrations on purpose.

  It rewrites existing storybook_generation_jobs rows and deletes photo bytes
  from request_payload and result_payload. That cannot be undone from the app.

  Run only after you have read the pull request note and decided the old photo
  bytes should be destroyed. There is no automatic backup in this script.

  How to run (SQL editor in the Supabase dashboard, or psql as the migration
  role). Read the script first. Then execute the whole file once.

    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/manual/scrub-storybook-job-photos.sql
*/

create or replace function public.storybook_scrub_photo_json(val jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  key text;
  elem jsonb;
  result jsonb;
  stripped text;
begin
  if val is null then
    return null;
  elsif jsonb_typeof(val) = 'object' then
    result := '{}'::jsonb;
    for key in select jsonb_object_keys(val)
    loop
      if lower(key) in (
        'heroreferenceimage',
        'heroreferenceimages',
        'characterreferencephotos',
        'referencephoto',
        'referenceimage',
        'photodataurl',
        'imagedata'
      ) then
        result := result || jsonb_build_object(key, 'null'::jsonb);
      else
        result := result || jsonb_build_object(key, public.storybook_scrub_photo_json(val -> key));
      end if;
    end loop;
    return result;
  elsif jsonb_typeof(val) = 'array' then
    result := '[]'::jsonb;
    for elem in select * from jsonb_array_elements(val)
    loop
      result := result || jsonb_build_array(public.storybook_scrub_photo_json(elem));
    end loop;
    return result;
  elsif jsonb_typeof(val) = 'string' then
    stripped := val #>> '{}';
    if stripped ~* '^data:image/' then
      return 'null'::jsonb;
    end if;
    if length(stripped) > 2000 and stripped ~ '^[A-Za-z0-9+/=[:space:]]+$' then
      return 'null'::jsonb;
    end if;
    return val;
  else
    return val;
  end if;
end;
$$;

-- Preview (safe): how many rows still look like they hold a photo.
-- select count(*) from public.storybook_generation_jobs
-- where request_payload::text ~* 'data:image/|heroReference|characterReference|referencePhoto'
--    or coalesce(result_payload::text, '') ~* 'data:image/|heroReference|characterReference|referencePhoto';

update public.storybook_generation_jobs
set
  request_payload = public.storybook_scrub_photo_json(request_payload),
  result_payload = public.storybook_scrub_photo_json(result_payload)
where
  request_payload::text ~* 'data:image/|heroReference|characterReference|referencePhoto|referenceImage'
  or coalesce(result_payload::text, '') ~* 'data:image/|heroReference|characterReference|referencePhoto|referenceImage';
