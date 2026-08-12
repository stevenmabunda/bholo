-- BHOLO: Storage buckets + policies
-- Run after 003_rls.sql.
-- Upload path convention: {bucket}/{userId}/{filename} — the UID must be
-- the FIRST path segment for storage.foldername(name)[1] to match it.

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('banners', 'banners', true),
  ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- avatars
create policy avatars_public_read on storage.objects for select
  using (bucket_id = 'avatars');
create policy avatars_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- banners
create policy banners_public_read on storage.objects for select
  using (bucket_id = 'banners');
create policy banners_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and (storage.foldername(name))[1] = auth.uid()::text);
create policy banners_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'banners' and (storage.foldername(name))[1] = auth.uid()::text);
create policy banners_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and (storage.foldername(name))[1] = auth.uid()::text);

-- post-media (post images/video, and comment media under {uid}/comments/{postId}/{filename})
create policy post_media_public_read on storage.objects for select
  using (bucket_id = 'post-media');
create policy post_media_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy post_media_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy post_media_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
