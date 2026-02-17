-- Create Syllabus Table
CREATE TABLE public.syllabus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL,
  topic TEXT NOT NULL,
  learning_outcomes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, week_number)
);

-- Trigger for updated_at
CREATE TRIGGER handle_syllabus_updated_at
BEFORE UPDATE ON public.syllabus
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE public.syllabus ENABLE ROW LEVEL SECURITY;

-- Policies (Inherit from Subject/Faculty)
-- Admins can do everything
CREATE POLICY "Admins can view syllabus in their faculty" ON public.syllabus
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.subjects
    WHERE id = subject_id AND is_admin_of(faculty_id)
  )
);

CREATE POLICY "Admins can insert syllabus in their faculty" ON public.syllabus
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.subjects
    WHERE id = subject_id AND is_admin_of(faculty_id)
  )
);

CREATE POLICY "Admins can update syllabus in their faculty" ON public.syllabus
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.subjects
    WHERE id = subject_id AND is_admin_of(faculty_id)
  )
);

CREATE POLICY "Admins can delete syllabus in their faculty" ON public.syllabus
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.subjects
    WHERE id = subject_id AND is_admin_of(faculty_id)
  )
);

-- Lecturers/Students can view (refine later if needed, for now let's allow authenticated read if they have access to the subject??
-- Actually, let's just allow all authenticated users to view syllabus for now, similar to faculties, or restrict to faculty.
CREATE POLICY "Faculty users can view syllabus" ON public.syllabus
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.subjects
    JOIN public.users ON public.subjects.faculty_id = public.users.faculty_id
    WHERE public.subjects.id = syllabus.subject_id AND public.users.id = auth.uid()
  )
);
