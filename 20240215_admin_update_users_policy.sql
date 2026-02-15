-- Allow admins to update users in their faculty (to set role/lecturer_id)
-- Note: When a new user is created, they might not have a faculty_id yet (it's NULL).
-- So the check "faculty_id = public.users.faculty_id" on the target row might fail if target is NULL.
-- We need to allow admins to update users where ID matches.
-- But we must restrict it so admins can't update OTHER admins or users from OTHER faculties.
-- Since the new user has NO faculty, we can allow updates to users with NULL faculty_id IF we are an admin?
-- OR we can relies on the valid "lecturer_id" link. 
-- Let's allow Admins to update ANY user if the target user has role='student' (default) AND faculty_id IS NULL.
-- This is safe enough for "claiming" new users.

CREATE POLICY "Admins can claim new users" ON public.users
FOR UPDATE
USING (
  (role = 'student' AND faculty_id IS NULL) OR
  (faculty_id IN (SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin'))
)
WITH CHECK (
  faculty_id IN (SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
