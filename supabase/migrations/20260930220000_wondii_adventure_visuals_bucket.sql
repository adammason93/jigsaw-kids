/*
  Classroom adventure artwork. The Edge Function writes with the service role.
  Public read lets the classroom board load a scene without a signed URL.
  Paths are school-scoped. Image bytes stay out of adventure JSON.
*/

insert into storage.buckets (id, name, public)
values ('wondii_adventure_visuals', 'wondii_adventure_visuals', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "wondii_adventure_visuals_public_select" on storage.objects;

create policy "wondii_adventure_visuals_public_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'wondii_adventure_visuals');
