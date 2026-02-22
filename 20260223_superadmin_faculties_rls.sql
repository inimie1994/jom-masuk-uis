-- Superadmin Faculties Management Policies
-- This script adds RLS policies allowing superadmins to seamlessly manage the faculties table.

-- 1. Insert Policy
DROP POLICY IF EXISTS "Superadmins can insert faculties" ON public.faculties;
CREATE POLICY "Superadmins can insert faculties" ON public.faculties
  FOR INSERT
  WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'superadmin'
  );

-- 2. Update Policy
DROP POLICY IF EXISTS "Superadmins can update any faculty" ON public.faculties;
CREATE POLICY "Superadmins can update any faculty" ON public.faculties
  FOR UPDATE
  USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'superadmin'
  );

-- 3. Delete Policy
DROP POLICY IF EXISTS "Superadmins can delete any faculty" ON public.faculties;
CREATE POLICY "Superadmins can delete any faculty" ON public.faculties
  FOR DELETE
  USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'superadmin'
  );

-- Force RLS enable (just in case)
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
