/*
  Public storage bucket for ephemeral storybook spread images written by the
  `clever-service` Edge Function (uses gpt-image-1 / future "GPT Image 2",
  which returns base64 — we upload PNGs and serve via public URLs).

  Service role (Edge Functions) writes; public reads.
*/

insert into storage.buckets (id, name, public)
values ('storybook_images', 'storybook_images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "storybook_images_public_select" on storage.objects;
drop policy if exists "storybook_images_service_write" on storage.objects;

create policy "storybook_images_public_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'storybook_images');

create policy "storybook_images_service_write"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'storybook_images');
