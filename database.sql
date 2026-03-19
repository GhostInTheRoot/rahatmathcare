-- ================================================================
--  Rahat Math Care — Supabase SQL Setup
--  Run this in Supabase → SQL Editor → New Query → Run
-- ================================================================

-- ── Original exam tables (already exist, skip if you have them) ──

create table if not exists written_exams (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  class_name text not null,
  duration integer not null,
  alert_time integer default 0,
  drive_link text not null,
  created_at timestamptz default now()
);

create table if not exists mcq_exams (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  class_name text not null,
  duration integer not null,
  alert_time integer default 0,
  drive_link text,
  questions text not null,
  created_at timestamptz default now()
);

create table if not exists written_results (
  id uuid default gen_random_uuid() primary key,
  student_name text,
  roll_no text,
  class_name text,
  phone text,
  exam_id uuid,
  exam_title text,
  photo_url text,
  all_photo_urls text,
  submitted_at timestamptz default now()
);

create table if not exists mcq_results (
  id uuid default gen_random_uuid() primary key,
  student_name text,
  roll_no text,
  class_name text,
  exam_id uuid,
  exam_title text,
  score integer,
  total integer,
  correct integer,
  wrong integer,
  skipped integer,
  pct integer,
  answers text,
  submitted_at timestamptz default now()
);

-- ── NEW: Website content tables ──────────────────────────────

-- Programs (HSC batches)
create table if not exists site_programs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  subtitle text,
  description text,
  admission_fee numeric default 0,
  monthly_fee numeric default 800,
  badge text,
  badge_type text default 'free',
  features text default '[]',
  featured boolean default false,
  status text default 'active',
  created_at timestamptz default now()
);

-- Batch schedules
create table if not exists site_schedules (
  id uuid default gen_random_uuid() primary key,
  batch_name text not null,
  subtitle text,
  class_time text,
  venue text,
  class_days text default '[]',
  note text,
  status text default 'active',
  created_at timestamptz default now()
);

-- Gallery photos
create table if not exists site_gallery (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  image_url text,
  category text default 'Classes',
  description text,
  created_at timestamptz default now()
);

-- Contact info (single row, updated in place)
create table if not exists site_contact (
  id uuid default gen_random_uuid() primary key,
  phone1 text,
  phone2 text,
  email text,
  whatsapp text,
  address text,
  hours1 text,
  hours2 text,
  map_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Disable RLS on all tables (allow public read/write) ───────
--  (or add row-level security policies if you prefer)

alter table written_exams disable row level security;
alter table mcq_exams disable row level security;
alter table written_results disable row level security;
alter table mcq_results disable row level security;
alter table site_programs disable row level security;
alter table site_schedules disable row level security;
alter table site_gallery disable row level security;
alter table site_contact disable row level security;


-- new 
-- ================================================================
--  Rahat Math Care — Supabase SQL Setup
--  Run this in Supabase → SQL Editor → New Query → Run
-- ================================================================

-- ── Original exam tables (already exist, skip if you have them) ──

create table if not exists written_exams (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  class_name text not null,
  duration integer not null,
  alert_time integer default 0,
  drive_link text not null,
  created_at timestamptz default now()
);

create table if not exists mcq_exams (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  class_name text not null,
  duration integer not null,
  alert_time integer default 0,
  drive_link text,
  questions text not null,
  created_at timestamptz default now()
);

create table if not exists written_results (
  id uuid default gen_random_uuid() primary key,
  student_name text,
  roll_no text,
  class_name text,
  phone text,
  exam_id uuid,
  exam_title text,
  photo_url text,
  all_photo_urls text,
  submitted_at timestamptz default now()
);

create table if not exists mcq_results (
  id uuid default gen_random_uuid() primary key,
  student_name text,
  roll_no text,
  class_name text,
  exam_id uuid,
  exam_title text,
  score integer,
  total integer,
  correct integer,
  wrong integer,
  skipped integer,
  pct integer,
  answers text,
  submitted_at timestamptz default now()
);

-- ── NEW: Website content tables ──────────────────────────────

-- Programs (HSC batches)
create table if not exists site_programs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  subtitle text,
  description text,
  admission_fee numeric default 0,
  monthly_fee numeric default 800,
  badge text,
  badge_type text default 'free',
  features text default '[]',
  featured boolean default false,
  status text default 'active',
  created_at timestamptz default now()
);

-- Batch schedules
create table if not exists site_schedules (
  id uuid default gen_random_uuid() primary key,
  batch_name text not null,
  subtitle text,
  class_time text,
  venue text,
  class_days text default '[]',
  note text,
  status text default 'active',
  created_at timestamptz default now()
);

-- Gallery photos
create table if not exists site_gallery (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  image_url text,
  category text default 'Classes',
  description text,
  created_at timestamptz default now()
);

-- Contact info (single row, updated in place)
create table if not exists site_contact (
  id uuid default gen_random_uuid() primary key,
  phone1 text,
  phone2 text,
  email text,
  whatsapp text,
  address text,
  hours1 text,
  hours2 text,
  map_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Disable RLS on all tables (allow public read/write) ───────
--  (or add row-level security policies if you prefer)

alter table written_exams disable row level security;
alter table mcq_exams disable row level security;
alter table written_results disable row level security;
alter table mcq_results disable row level security;
alter table site_programs disable row level security;
alter table site_schedules disable row level security;
alter table site_gallery disable row level security;
alter table site_contact disable row level security;

-- ── Add image_data column to site_gallery for direct image uploads ──
ALTER TABLE site_gallery ADD COLUMN IF NOT EXISTS image_data TEXT;