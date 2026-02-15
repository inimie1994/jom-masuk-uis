-- Allow admins to update their faculty details
CREATE POLICY "Admins can update their faculty" ON public.faculties
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND faculty_id = public.faculties.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND faculty_id = public.faculties.id
  )
);
