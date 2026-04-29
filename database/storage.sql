-- Supabase storage setup for resource uploads.
-- Run this in the Supabase SQL editor after schema.sql.

insert into storage.buckets (id, name, public)
values ('lms-resources', 'lms-resources', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "authenticated_read_lms_resources" on storage.objects;
create policy "authenticated_read_lms_resources"
on storage.objects for select
to authenticated
using (bucket_id = 'lms-resources');

drop policy if exists "teacher_admin_upload_lms_resources" on storage.objects;
create policy "teacher_admin_upload_lms_resources"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lms-resources'
  and public.is_teacher_or_admin_user()
);

drop policy if exists "teacher_admin_update_lms_resources" on storage.objects;
create policy "teacher_admin_update_lms_resources"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lms-resources'
  and public.is_teacher_or_admin_user()
)
with check (
  bucket_id = 'lms-resources'
  and public.is_teacher_or_admin_user()
);

drop policy if exists "teacher_admin_delete_lms_resources" on storage.objects;
create policy "teacher_admin_delete_lms_resources"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'lms-resources'
  and public.is_teacher_or_admin_user()
);
