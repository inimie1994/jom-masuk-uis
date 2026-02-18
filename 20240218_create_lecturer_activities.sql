-- Create lecturer_activities table
CREATE TABLE IF NOT EXISTS public.lecturer_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecturer_id UUID REFERENCES public.lecturers(id) ON DELETE CASCADE NOT NULL,
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    activity_type TEXT NOT NULL, -- e.g., 'Research', 'Consultation', 'Meeting', 'Other'
    activity_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT activity_time_check CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.lecturer_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all activities"
    ON public.lecturer_activities
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Lecturers can manage own activities"
    ON public.lecturer_activities
    FOR ALL
    USING (
        lecturer_id IN (
            SELECT lecturer_id FROM public.users WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        lecturer_id IN (
            SELECT lecturer_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON public.lecturer_activities TO  postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecturer_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecturer_activities TO anon;
