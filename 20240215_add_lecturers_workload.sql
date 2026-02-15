-- Create Lecturers Table
CREATE TABLE IF NOT EXISTS public.lecturers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Workload Table
CREATE TABLE IF NOT EXISTS public.workload (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lecturer_id UUID NOT NULL REFERENCES public.lecturers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Lecture', 'Tutorial', 'Lab')),
    hours INTEGER NOT NULL CHECK (hours > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.lecturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workload ENABLE ROW LEVEL SECURITY;

-- Lecturers Policies
CREATE POLICY "Enable read access for users in same faculty" ON public.lecturers
    FOR SELECT
    USING (
        faculty_id IN (
            SELECT faculty_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Enable insert access for admins in same faculty" ON public.lecturers
    FOR INSERT
    WITH CHECK (
        faculty_id IN (
            SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Enable update access for admins in same faculty" ON public.lecturers
    FOR UPDATE
    USING (
        faculty_id IN (
            SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        faculty_id IN (
            SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Enable delete access for admins in same faculty" ON public.lecturers
    FOR DELETE
    USING (
        faculty_id IN (
            SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Workload Policies
-- We check permission via the lecturer's faculty_id
CREATE POLICY "Enable read access for users in same faculty" ON public.workload
    FOR SELECT
    USING (
        lecturer_id IN (
            SELECT id FROM public.lecturers WHERE faculty_id IN (
                SELECT faculty_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Enable insert access for admins in same faculty" ON public.workload
    FOR INSERT
    WITH CHECK (
        lecturer_id IN (
            SELECT id FROM public.lecturers WHERE faculty_id IN (
                SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

CREATE POLICY "Enable update access for admins in same faculty" ON public.workload
    FOR UPDATE
    USING (
        lecturer_id IN (
            SELECT id FROM public.lecturers WHERE faculty_id IN (
                SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
            )
        )
    )
    WITH CHECK (
        lecturer_id IN (
            SELECT id FROM public.lecturers WHERE faculty_id IN (
                SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

CREATE POLICY "Enable delete access for admins in same faculty" ON public.workload
    FOR DELETE
    USING (
        lecturer_id IN (
            SELECT id FROM public.lecturers WHERE faculty_id IN (
                SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );
