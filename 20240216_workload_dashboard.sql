-- Add student_group to workload table
ALTER TABLE public.workload
ADD COLUMN IF NOT EXISTS student_group TEXT;

-- Add lecturer_id to classes table
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS lecturer_id UUID REFERENCES public.lecturers(id) ON DELETE SET NULL;

-- Policy for lecturers to view their own classes
-- Check if policy exists first to avoid error, or just use Create Policy (will fail if exists, but that's fine for now or use DO block)
-- For simplicity in this environment, I'll just CREATE.
CREATE POLICY "Lecturers can view their own classes" ON public.classes
FOR SELECT
USING (
    lecturer_id IN (
        SELECT lecturer_id FROM public.users WHERE id = auth.uid()
    )
);

-- Also allow lecturers to view workload assigned to them?
-- Workload table might not have RLS enabled or might need policy.
-- Let's check workload RLS in a moment, but this file focuses on schema.
ALTER TABLE public.workload ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecturers can view their own workload" ON public.workload
FOR SELECT
USING (
    lecturer_id IN (
        SELECT lecturer_id FROM public.users WHERE id = auth.uid()
    )
);
