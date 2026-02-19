-- Migration: Fix Lecturer Schema and User Roles
-- 1. Add program_code and role to lecturers table
ALTER TABLE public.lecturers ADD COLUMN IF NOT EXISTS program_code TEXT;
ALTER TABLE public.lecturers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'lecturer';

-- 2. Update users role check constraint to include 'hod' and 'hop'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'lecturer', 'student', 'hod', 'hop'));
