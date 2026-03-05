-- ============================================================
-- UNJURAN MAKER: Projected Teaching Schedule for next semester
-- Run this in Supabase SQL Editor
-- ============================================================

-- Main rows table: one row per subject-group combination per session
CREATE TABLE IF NOT EXISTS public.unjuran (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    faculty_id       UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    session_name     TEXT NOT NULL,
    lecturer_id      UUID REFERENCES public.lecturers(id) ON DELETE SET NULL,
    lecturer_mode    TEXT,
    subject_id       UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    group_name       TEXT,
    class_type       TEXT CHECK (class_type IN ('Lecture','Tutorial','Lab','Mentoring')),
    kuliah_hours     INTEGER DEFAULT 0,
    tutorial_hours   INTEGER DEFAULT 0,
    makmal_hours     INTEGER DEFAULT 0,
    student_count    INTEGER DEFAULT 0,
    jam_mengajar     INTEGER DEFAULT 0,
    notes            TEXT,
    is_mentoring     BOOLEAN DEFAULT false,
    sort_order       INTEGER DEFAULT 0,
    created_by       UUID REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Per-lecturer summary: stores JAM TAHUNAN comparison values
CREATE TABLE IF NOT EXISTS public.unjuran_lecturer_summary (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    faculty_id            UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    session_name          TEXT NOT NULL,
    lecturer_id           UUID NOT NULL REFERENCES public.lecturers(id) ON DELETE CASCADE,
    jam_tahunan           JSONB DEFAULT '{}',
    comparison_sessions   TEXT[] DEFAULT '{}',
    created_at            TIMESTAMPTZ DEFAULT now(),
    updated_at            TIMESTAMPTZ DEFAULT now(),
    UNIQUE (faculty_id, session_name, lecturer_id)
);

-- Enable RLS
ALTER TABLE public.unjuran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unjuran_lecturer_summary ENABLE ROW LEVEL SECURITY;

-- RLS: unjuran rows
CREATE POLICY "unjuran_select_faculty" ON public.unjuran
    FOR SELECT USING (faculty_id IN (SELECT faculty_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "unjuran_insert_allowed" ON public.unjuran
    FOR INSERT WITH CHECK (faculty_id IN (
        SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role IN ('hop','hod','admin')
    ));

CREATE POLICY "unjuran_update_allowed" ON public.unjuran
    FOR UPDATE
    USING (faculty_id IN (SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role IN ('hop','hod','admin')))
    WITH CHECK (faculty_id IN (SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role IN ('hop','hod','admin')));

CREATE POLICY "unjuran_delete_allowed" ON public.unjuran
    FOR DELETE USING (faculty_id IN (
        SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role IN ('hop','hod','admin')
    ));

-- RLS: unjuran_lecturer_summary
CREATE POLICY "unjuran_summary_select" ON public.unjuran_lecturer_summary
    FOR SELECT USING (faculty_id IN (SELECT faculty_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "unjuran_summary_insert" ON public.unjuran_lecturer_summary
    FOR INSERT WITH CHECK (faculty_id IN (
        SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role IN ('hop','hod','admin')
    ));

CREATE POLICY "unjuran_summary_update" ON public.unjuran_lecturer_summary
    FOR UPDATE
    USING (faculty_id IN (SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role IN ('hop','hod','admin')))
    WITH CHECK (faculty_id IN (SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role IN ('hop','hod','admin')));

CREATE POLICY "unjuran_summary_delete" ON public.unjuran_lecturer_summary
    FOR DELETE USING (faculty_id IN (
        SELECT faculty_id FROM public.users WHERE id = auth.uid() AND role IN ('hop','hod','admin')
    ));
