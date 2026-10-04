begin;

-- Profile photos. The bucket is public to read by URL, so an <img> needs no token; writes go
-- through RLS on storage.objects, one folder per member: avatars/<user id>/<file>. The browser
-- crops and re-encodes every photo to a 256 px square (WebP, or PNG where WebP cannot be encoded),
-- which drops the original's metadata and keeps files small.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/webp', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Reading through the API (listing, and the lookup a removal makes) stays within one's own folder;
-- the public URL serves the image itself.
create policy "Members read their own avatar files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
  );

create policy "Members upload avatar files into their own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
  );

create policy "Members replace their own avatar files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Members remove their own avatar files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
  );

commit;
