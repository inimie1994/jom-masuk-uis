-- Create feedback_sessions table
CREATE TABLE IF NOT EXISTS public.feedback_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lecturer_id UUID REFERENCES public.lecturers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    semester_session TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Create feedback_responses table
CREATE TABLE IF NOT EXISTS public.feedback_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.feedback_sessions(id) ON DELETE CASCADE,
    ratings JSONB NOT NULL, -- Array of 12 integers [5, 4, ... ]
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.feedback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

-- Policies for feedback_sessions

-- Lecturers can view their own sessions
-- We link auth.uid() -> users.id, then users.lecturer_id -> feedback_sessions.lecturer_id
CREATE POLICY "Lecturers can view own sessions" ON public.feedback_sessions
    FOR SELECT USING (
        (SELECT lecturer_id FROM public.users WHERE id = auth.uid()) = lecturer_id
    );

-- Lecturers can create sessions
CREATE POLICY "Lecturers can create sessions" ON public.feedback_sessions
    FOR INSERT WITH CHECK (
        (SELECT lecturer_id FROM public.users WHERE id = auth.uid()) = lecturer_id
    );

-- Public access to read active sessions (for students filling the form)
CREATE POLICY "Public read active sessions" ON public.feedback_sessions
    FOR SELECT USING (is_active = true);

-- Policies for feedback_responses

-- Public can insert responses (students)
CREATE POLICY "Public insert responses" ON public.feedback_responses
    FOR INSERT WITH CHECK (true);

-- Lecturers can view responses for their sessions
CREATE POLICY "Lecturers can view responses for own sessions" ON public.feedback_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.feedback_sessions fs
            WHERE fs.id = session_id
            AND fs.lecturer_id = (SELECT lecturer_id FROM public.users WHERE id = auth.uid())
        )
    );
