-- Sample development data for the LMS.
-- Run this after schema.sql.
-- First create a few auth users in Supabase Auth, then update their profile roles with their real UUIDs.

insert into public.grades (name, display_order, description)
values
  ('Grade 1', 1, 'Foundation learning for young students'),
  ('Grade 5', 5, 'Upper primary learning track'),
  ('Grade 10', 10, 'O/L preparation grade'),
  ('Grade 11', 11, 'O/L final preparation grade'),
  ('Grade 12', 12, 'A/L general stream grade'),
  ('Grade 13', 13, 'A/L final preparation grade')
on conflict (name) do update
set display_order = excluded.display_order,
    description = excluded.description;

insert into public.modules (grade_id, title, code, description, icon, display_order)
select g.id, v.title, v.code, v.description, v.icon, v.display_order
from public.grades g
join (
  values
    ('Grade 10', 'Science', 'SCI-10', 'Science for Grade 10 students', 'flask', 1),
    ('Grade 10', 'Mathematics', 'MATH-10', 'Mathematics for Grade 10 students', 'calculator', 2),
    ('Grade 10', 'English', 'ENG-10', 'English language practice and grammar', 'book', 3),
    ('Grade 12', 'Combined Maths', 'CM-12', 'Combined mathematics for A/L', 'pi', 1),
    ('Grade 12', 'Physics', 'PHY-12', 'Physics for A/L science stream', 'atom', 2)
) as v(grade_name, title, code, description, icon, display_order)
  on g.name = v.grade_name
on conflict (grade_id, title) do update
set code = excluded.code,
    description = excluded.description,
    icon = excluded.icon,
    display_order = excluded.display_order;

insert into public.units (module_id, title, description, display_order)
select m.id, v.title, v.description, v.display_order
from public.modules m
join (
  values
    ('Science', 'Unit 1: Cells', 'Introduction to cell structure and function', 1),
    ('Science', 'Unit 2: Forces', 'Basic ideas about force and motion', 2),
    ('Mathematics', 'Unit 1: Algebra', 'Expressions and equations', 1),
    ('Combined Maths', 'Unit 1: Vectors', 'Vector operations and applications', 1),
    ('Physics', 'Unit 1: Mechanics', 'Motion, forces, and energy', 1)
) as v(module_title, title, description, display_order)
  on m.title = v.module_title
on conflict (module_id, title) do update
set description = excluded.description,
    display_order = excluded.display_order;

insert into public.resources (unit_id, kind, title, description, external_url, storage_path, thumbnail_path, duration_seconds, display_order)
select u.id, v.kind::public.resource_kind, v.title, v.description, v.external_url, v.storage_path, v.thumbnail_path, v.duration_seconds, v.display_order
from public.units u
join (
  values
    ('Unit 1: Cells', 'tute', 'Cell Structure Notes', 'PDF notes for cell structure', null, 'resources/grade10/science/cells-notes.pdf', null, null, 1),
    ('Unit 1: Cells', 'video', 'Cell Structure Lecture', 'Video lesson for the chapter', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', null, null, 920, 2),
    ('Unit 2: Forces', 'paper', 'Forces Past Paper', 'Important past paper questions', null, 'resources/grade10/science/forces-paper.pdf', null, null, 1),
    ('Unit 1: Algebra', 'tute', 'Algebra Practice Sheet', 'Practice worksheet for equations', null, 'resources/grade10/math/algebra-sheet.pdf', null, null, 1),
    ('Unit 1: Mechanics', 'video', 'Mechanics Lecture 1', 'Introduction to mechanics', 'https://www.youtube.com/watch?v=5qap5aO4i9A', null, null, 1800, 1)
) as v(unit_title, kind, title, description, external_url, storage_path, thumbnail_path, duration_seconds, display_order)
  on u.title = v.unit_title
on conflict do nothing;

insert into public.announcements (title, body, kind, grade_id)
select v.title, v.body, v.kind::public.announcement_kind, g.id
from public.grades g
join (
  values
    ('Grade 10', 'Science revision class this Friday', 'Live revision session at 4 PM on Friday', 'info'),
    ('Grade 12', 'A/L paper upload completed', 'Latest papers are now available in the physics module', 'success')
) as v(grade_name, title, body, kind)
  on g.name = v.grade_name
on conflict do nothing;
