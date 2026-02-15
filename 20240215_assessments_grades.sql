-- Create Assessments Table
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    total_marks DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    weightage DECIMAL(5, 2) NOT NULL DEFAULT 0.00, -- Percentage contribution to final grade
    date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Grades Table
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE, -- Denormalized for easier RLS
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(10, 2),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, student_id)
);

-- Enable RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Policies for Assessments
CREATE POLICY "Enable read for authenticated users based on faculty" ON public.assessments
    FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE faculty_id = assessments.faculty_id));

CREATE POLICY "Enable all for authenticated users based on faculty" ON public.assessments
    FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE faculty_id = assessments.faculty_id));

-- Policies for Grades
CREATE POLICY "Enable read for authenticated users based on faculty" ON public.grades
    FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE faculty_id = grades.faculty_id));

CREATE POLICY "Enable all for authenticated users based on faculty" ON public.grades
    FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE faculty_id = grades.faculty_id));

-- Trigger to update updated_at
CREATE TRIGGER update_assessments_modtime BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_grades_modtime BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
