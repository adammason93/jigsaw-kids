/*
  Delete storybook_generation_jobs 72 hours after they finish, and also delete
  rows that are still pending or running after 72 hours (the worker has died).

  pg_cron is used when the extension is available (typical on Supabase Pro).
  If it is not, or scheduling is denied, this migration only logs a notice.
  clever-service also deletes the same rows whenever a book is started or a
  job is polled, so retention does not depend on cron.

  This does not rewrite photo payloads. The manual scrub is separate.
*/

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is not available; clever-service will purge storybook jobs on request';
    return;
  end if;

  begin
    create extension if not exists pg_cron;
    if exists (select 1 from cron.job where jobname = 'purge_storybook_generation_jobs') then
      perform cron.unschedule('purge_storybook_generation_jobs');
    end if;
    perform cron.schedule(
      'purge_storybook_generation_jobs',
      '17 * * * *',
      $cron$
        delete from public.storybook_generation_jobs
        where (
          status in ('complete', 'failed')
          and completed_at is not null
          and completed_at < now() - interval '72 hours'
        )
        or (
          status in ('pending', 'running')
          and updated_at < now() - interval '72 hours'
        )
        or (
          status in ('complete', 'failed')
          and completed_at is null
          and updated_at < now() - interval '72 hours'
        );
      $cron$
    );
  exception
    when others then
      raise notice 'storybook job purge cron was not scheduled: %', sqlerrm;
  end;
end $$;
