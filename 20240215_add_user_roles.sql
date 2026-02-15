-- Add role and lecturer_id to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin', 'lecturer')) DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS lecturer_id UUID REFERENCES public.lecturers(id) ON DELETE SET NULL;

-- Update RLS policies to allow lecturers to see their own data
-- (Existing policies might already cover "auth.uid() = id", but let's double check if we need specific policies for lecturer-specific views later)

-- No major RLS changes needed for the *users* table itself yet, 
-- as users can usually only read their own profile.
