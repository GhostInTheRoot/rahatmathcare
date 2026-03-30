-- ================================================================
--  Rahat Math Care — Supabase SQL Setup (Secure Edition)
--  Run this in Supabase → SQL Editor → New Query → Run
-- ================================================================

-- ── Tables ───────────────────────────────────────────────────────

create table if not exists written_exams (
  id uuid default gen_random_uuid() primary key,
  title text not null, class_name text not null,
  duration integer not null, alert_time integer default 0,
  drive_link text not null, created_at timestamptz default now()
);
create table if not exists mcq_exams (
  id uuid default gen_random_uuid() primary key,
  title text not null, class_name text not null,
  duration integer not null, alert_time integer default 0,
  drive_link text, questions text not null, created_at timestamptz default now()
);
create table if not exists written_results (
  id uuid default gen_random_uuid() primary key,
  student_name text, roll_no text, class_name text, phone text,
  exam_id uuid, exam_title text, photo_url text, all_photo_urls text,
  checked_urls text,
  marks_obtained numeric, marks_total numeric, remarks text,
  submitted_at timestamptz default now()
);
create table if not exists mcq_results (
  id uuid default gen_random_uuid() primary key,
  student_name text, roll_no text, class_name text,
  exam_id uuid, exam_title text,
  score integer, total integer, correct integer, wrong integer, skipped integer, pct integer,
  answers text, submitted_at timestamptz default now()
);
create table if not exists site_programs (
  id uuid default gen_random_uuid() primary key,
  name text not null, subtitle text, description text,
  admission_fee numeric default 0, monthly_fee numeric default 800,
  badge text, badge_type text default 'free', features text default '[]',
  featured boolean default false, status text default 'active',
  created_at timestamptz default now()
);
create table if not exists site_schedules (
  id uuid default gen_random_uuid() primary key,
  batch_name text not null, subtitle text, class_time text,
  venue text, class_days text default '[]', note text,
  status text default 'active', created_at timestamptz default now()
);
create table if not exists site_gallery (
  id uuid default gen_random_uuid() primary key,
  title text not null, image_url text, image_data text,
  category text default 'Classes', description text,
  created_at timestamptz default now()
);
create table if not exists site_contact (
  id uuid default gen_random_uuid() primary key,
  phone1 text, phone2 text, email text, whatsapp text, address text,
  hours1 text, hours2 text, map_url text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists site_notices (
  id uuid default gen_random_uuid() primary key,
  title text not null, body text not null,
  type text default 'general', target text,
  pinned boolean default false, created_at timestamptz default now()
);
create table if not exists students (
  id uuid default gen_random_uuid() primary key,
  student_name text not null, roll_no text not null, phone text not null,
  class_name text, status text default 'active',
  college text, whatsapp text, address text, bio text,
  password_hash text, avatar text,
  otp_hash text, otp_expiry timestamptz,
  created_at timestamptz default now()
);

-- ── ADD COLUMNS (safe to run even if they already exist) ──────────
-- [NEW] Thumbnail for exam cards - added Mar 2026
alter table written_exams add column if not exists thumbnail text;
alter table mcq_exams add column if not exists thumbnail text;

-- [NEW] Exam scheduling (start/end time) - added Mar 2026
alter table written_exams add column if not exists exam_start timestamptz;
alter table written_exams add column if not exists exam_end timestamptz;
alter table mcq_exams add column if not exists exam_start timestamptz;
alter table mcq_exams add column if not exists exam_end timestamptz;

-- [NEW] Practice mode flag in results
alter table mcq_results add column if not exists is_practice boolean default false;
alter table written_results add column if not exists is_practice boolean default false;

alter table students add column if not exists password_hash text;
alter table students add column if not exists avatar text;
alter table students add column if not exists otp_hash text;
alter table students add column if not exists otp_expiry timestamptz;
alter table site_gallery add column if not exists image_data text;
alter table written_results add column if not exists marks_obtained numeric;
alter table written_results add column if not exists marks_total numeric;
alter table written_results add column if not exists remarks text;
alter table written_results add column if not exists checked_urls text;
alter table site_contact add column if not exists app_download_link text;

-- ================================================================
--  ROW LEVEL SECURITY
--  Public anon key → SELECT only (read)
--  All writes → Edge Functions using service_role key
-- ================================================================

alter table written_exams   enable row level security;
alter table mcq_exams       enable row level security;
alter table written_results enable row level security;
alter table mcq_results     enable row level security;
alter table site_programs   enable row level security;
alter table site_schedules  enable row level security;
alter table site_gallery    enable row level security;
alter table site_contact    enable row level security;
alter table site_notices    enable row level security;
alter table students        enable row level security;

-- ── Drop old policies if they exist, then recreate ────────────────
-- (avoids "already exists" errors on re-run)

do $$ begin
  drop policy if exists "public_read_written_exams"   on written_exams;
  drop policy if exists "public_read_mcq_exams"       on mcq_exams;
  drop policy if exists "public_read_written_results" on written_results;
  drop policy if exists "public_read_mcq_results"     on mcq_results;
  drop policy if exists "public_read_site_programs"   on site_programs;
  drop policy if exists "public_read_site_schedules"  on site_schedules;
  drop policy if exists "public_read_site_gallery"    on site_gallery;
  drop policy if exists "public_read_site_contact"    on site_contact;
  drop policy if exists "public_read_site_notices"    on site_notices;
  drop policy if exists "public_read_students"        on students;
exception when others then null;
end $$;

-- ── Public SELECT policies (anyone with anon key can read) ────────
create policy "public_read_written_exams"   on written_exams   for select using (true);
create policy "public_read_mcq_exams"       on mcq_exams       for select using (true);
create policy "public_read_written_results" on written_results  for select using (true);
create policy "public_read_mcq_results"     on mcq_results     for select using (true);
create policy "public_read_site_programs"   on site_programs   for select using (true);
create policy "public_read_site_schedules"  on site_schedules  for select using (true);
create policy "public_read_site_gallery"    on site_gallery    for select using (true);
create policy "public_read_site_contact"    on site_contact    for select using (true);
create policy "public_read_site_notices"    on site_notices    for select using (true);
create policy "public_read_students"        on students        for select using (true);

-- ── NOTE ──────────────────────────────────────────────────────────
-- No INSERT/UPDATE/DELETE policies needed for anon role.
-- All writes go through Edge Functions which use service_role key.
-- service_role bypasses RLS automatically — no policy needed.
