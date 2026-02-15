-- Create Timetable Table
CREATE TABLE IF NOT EXISTS public.timetable (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL, -- Storing group name directly as there is no student_groups table
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES public.lecturers(id) ON DELETE SET NULL,
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT timetable_time_check CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

-- Timetable Policies
CREATE POLICY "Enable read access for users in same faculty" ON public.timetable
    FOR SELECT
    USING (
        faculty_id IN (
            SELECT faculty_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Enable insert access for admins in same faculty" ON public.timetable
    FOR INSERT
    WITH CHECK (
        faculty_id IN (
            SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Enable update access for admins in same faculty" ON public.timetable
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

CREATE POLICY "Enable delete access for admins in same faculty" ON public.timetable
    FOR DELETE
    USING (
        faculty_id IN (
            SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );
