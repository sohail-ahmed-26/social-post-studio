-- Owner: Supabase Dashboard -> SQL Editor mein ek baar chalao.
-- Public bucket + sirf login user apne folder (<user_id>/...) mein upload kar sake.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

drop policy if exists "post-images public read" on storage.objects;
create policy "post-images public read" on storage.objects
  for select using (bucket_id = 'post-images');

drop policy if exists "post-images owner upload" on storage.objects;
create policy "post-images owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post-images owner update" on storage.objects;
create policy "post-images owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
