-- Delta Messaging Platform: Supabase Storage Buckets and Policies

-- 1. Create Buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('attachments', 'attachments', false, 52428800, null), -- private: 50MB max limit
  ('statuses', 'statuses', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']) -- 20MB limit
on conflict (id) do nothing;

-- 2. Avatars Storage Policies
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Attachments Storage Policies (Private bucket with secure pathing)
create policy "Authenticated users can read attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'attachments');

create policy "Authenticated users can upload attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Statuses Storage Policies
create policy "Authenticated users can view statuses media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'statuses');

create policy "Users can upload their own status media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'statuses' and (storage.foldername(name))[1] = auth.uid()::text);
