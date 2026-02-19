-- Add HOD and HOP roles to users table check constraint
-- Note: We can't easily alter a check constraint in PostgreSQL without dropping and re-adding it.
-- Or we can just drop the constraint if it exists and add a new one.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'lecturer', 'hod', 'hop'));

-- Add program_code to lecturers table for HOPs
ALTER TABLE public.lecturers ADD COLUMN IF NOT EXISTS program_code TEXT;

-- Add role to lecturers table for easier querying (denormalized from users)
ALTER TABLE public.lecturers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'lecturer';
