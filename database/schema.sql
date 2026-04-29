-- LMS core schema for Supabase PostgreSQL
-- Run this in the Supabase SQL editor after creating the project.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.resource_kind as enum ('tute', 'paper', 'video');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.announcement_kind as enum ('info', 'warning', 'success');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grades (
  id bigserial primary key,
  name text not null unique,
  display_order integer not null default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  grade_id bigint not null references public.grades(id) on delete cascade,
  title text not null,
  code text,
  description text,
  icon text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grade_id, title)
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, title)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  kind public.resource_kind not null,
  title text not null,
  description text,
  external_url text,
  storage_path text,
  thumbnail_path text,
  duration_seconds integer,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_modules (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (teacher_id, module_id)
);

create table if not exists public.enrollments (
  student_id uuid not null references public.profiles(id) on delete cascade,
  grade_id bigint not null references public.grades(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (student_id, grade_id)
);

create table if not exists public.progress (
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  progress_percent numeric(5,2) not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, resource_id)
);

create table if not exists public.announcements (
  id bigserial primary key,
  title text not null,
  body text not null,
  kind public.announcement_kind not null default 'info',
  grade_id bigint references public.grades(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_modules_grade_id on public.modules(grade_id);
create index if not exists idx_units_module_id on public.units(module_id);
create index if not exists idx_resources_unit_id on public.resources(unit_id);
create index if not exists idx_teacher_modules_module_id on public.teacher_modules(module_id);
create index if not exists idx_enrollments_grade_id on public.enrollments(grade_id);
create index if not exists idx_progress_student_id on public.progress(student_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.is_teacher_or_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('teacher', 'admin');
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_grades_updated_at on public.grades;
create trigger trg_grades_updated_at
before update on public.grades
for each row execute function public.set_updated_at();

drop trigger if exists trg_modules_updated_at on public.modules;
create trigger trg_modules_updated_at
before update on public.modules
for each row execute function public.set_updated_at();

drop trigger if exists trg_units_updated_at on public.units;
create trigger trg_units_updated_at
before update on public.units
for each row execute function public.set_updated_at();

drop trigger if exists trg_resources_updated_at on public.resources;
create trigger trg_resources_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'user@example.com'), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      avatar_url = excluded.avatar_url;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.grades enable row level security;
alter table public.modules enable row level security;
alter table public.units enable row level security;
alter table public.resources enable row level security;
alter table public.teacher_modules enable row level security;
alter table public.enrollments enable row level security;
alter table public.progress enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (auth.uid() = id or public.is_admin_user())
with check (auth.uid() = id or public.is_admin_user());

drop policy if exists "public_read_grades" on public.grades;
create policy "public_read_grades"
on public.grades for select
to authenticated
using (true);

drop policy if exists "public_manage_grades_admin" on public.grades;
create policy "public_manage_grades_admin"
on public.grades for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "public_read_modules" on public.modules;
create policy "public_read_modules"
on public.modules for select
to authenticated
using (true);

drop policy if exists "teacher_admin_manage_modules" on public.modules;
create policy "teacher_admin_manage_modules"
on public.modules for all
to authenticated
using (public.is_teacher_or_admin_user())
with check (public.is_teacher_or_admin_user());

drop policy if exists "public_read_units" on public.units;
create policy "public_read_units"
on public.units for select
to authenticated
using (true);

drop policy if exists "teacher_admin_manage_units" on public.units;
create policy "teacher_admin_manage_units"
on public.units for all
to authenticated
using (public.is_teacher_or_admin_user())
with check (public.is_teacher_or_admin_user());

drop policy if exists "public_read_resources" on public.resources;
create policy "public_read_resources"
on public.resources for select
to authenticated
using (true);

drop policy if exists "teacher_admin_manage_resources" on public.resources;
create policy "teacher_admin_manage_resources"
on public.resources for all
to authenticated
using (public.is_teacher_or_admin_user())
with check (public.is_teacher_or_admin_user());

drop policy if exists "teacher_admin_manage_teacher_modules" on public.teacher_modules;
create policy "teacher_admin_manage_teacher_modules"
on public.teacher_modules for all
to authenticated
using (public.is_teacher_or_admin_user())
with check (public.is_teacher_or_admin_user());

drop policy if exists "student_read_own_enrollments" on public.enrollments;
create policy "student_read_own_enrollments"
on public.enrollments for select
to authenticated
using (student_id = auth.uid() or public.is_admin_user());

drop policy if exists "admin_manage_enrollments" on public.enrollments;
create policy "admin_manage_enrollments"
on public.enrollments for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "student_read_own_progress" on public.progress;
create policy "student_read_own_progress"
on public.progress for select
to authenticated
using (student_id = auth.uid() or public.is_teacher_or_admin_user());

drop policy if exists "student_manage_own_progress" on public.progress;
create policy "student_manage_own_progress"
on public.progress for all
to authenticated
using (student_id = auth.uid() or public.is_teacher_or_admin_user())
with check (student_id = auth.uid() or public.is_teacher_or_admin_user());

drop policy if exists "authenticated_read_announcements" on public.announcements;
create policy "authenticated_read_announcements"
on public.announcements for select
to authenticated
using (true);

drop policy if exists "admin_manage_announcements" on public.announcements;
create policy "admin_manage_announcements"
on public.announcements for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
