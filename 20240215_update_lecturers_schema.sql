-- Add email and temp_password to lecturers table
ALTER TABLE public.lecturers 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS temp_password TEXT;

-- Update RLS to ensure admins can read these sensitive fields
-- Existing policy "Admins can view lecturers in their faculty" should cover SELECT
-- We just need to make sure simple "lecturer" role users CANNOT see other lecturers' temp_password.
-- But standard "lecturer" role users might only see their own profile or public info?
-- Let's check if we strictly need column-level security or if table-level is enough.
-- As per requirement, "admin can view them".

-- Ensure admins can update these fields
CREATE POLICY "Admins can update lecturers in their faculty" ON public.lecturers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND faculty_id = public.lecturers.faculty_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND faculty_id = public.lecturers.faculty_id
  )
);
