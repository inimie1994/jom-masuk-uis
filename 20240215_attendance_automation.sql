-- 1. Create Attendance Tables
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id),
    group_name TEXT NOT NULL,
    class_type TEXT,
    lecturer_id UUID REFERENCES public.lecturers(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

-- Enable RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read for authenticated users based on faculty" ON public.attendance_sessions FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE faculty_id = attendance_sessions.faculty_id));
CREATE POLICY "Enable all for authenticated users based on faculty" ON public.attendance_sessions FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE faculty_id = attendance_sessions.faculty_id));

CREATE POLICY "Enable read for authenticated users based on session faculty" ON public.attendance_records FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.attendance_sessions WHERE id = attendance_records.session_id AND faculty_id IN (SELECT faculty_id FROM users WHERE id = auth.uid()))
);
CREATE POLICY "Enable all for authenticated users based on session faculty" ON public.attendance_records FOR ALL USING (
    EXISTS (SELECT 1 FROM public.attendance_sessions WHERE id = attendance_records.session_id AND faculty_id IN (SELECT faculty_id FROM users WHERE id = auth.uid()))
);


-- 2. Auto Enrollment Trigger Function
-- When a timetable entry is added/updated, ensure all students in that group are 'enrolled' in that class.
-- Note: 'Enrollment' in this context might ideally map to a 'classes' table, but based on the schema request,
-- we might just need to ensure we can find who is in the class for attendance.
-- Since we identify attendance by (subject + group), we can query students by group directly.
-- However, if there's an explicit 'enrollments' table (student <-> class), we should populate it.
-- Let's check if 'classes' table exists and use it, otherwise we'll skip complex enrollment logic if queries can be done via group directly.
-- *Checking schema... 'classes' exists.*

CREATE OR REPLACE FUNCTION public.sync_enrollments_from_timetable()
RETURNS TRIGGER AS $$
DECLARE
    target_class_id UUID;
    student_rec RECORD;
BEGIN
    -- Only proceed if we have a subject and group
    IF NEW.subject_id IS NULL OR NEW.group_name IS NULL THEN
        RETURN NULL;
    END IF;

    -- 1. Find or Create a Class record for this Subject + Group
    -- We assume 'section' in classes table corresponds to 'group_name'
    SELECT id INTO target_class_id FROM public.classes 
    WHERE subject_id = NEW.subject_id AND section = NEW.group_name AND faculty_id = NEW.faculty_id
    LIMIT 1;

    IF target_class_id IS NULL THEN
        INSERT INTO public.classes (faculty_id, subject_id, section, semester)
        VALUES (NEW.faculty_id, NEW.subject_id, NEW.group_name, 'Current') -- Default 'Current' semester
        RETURNING id INTO target_class_id;
    END IF;

    -- 2. Enroll all students from this group into this class
    FOR student_rec IN 
        SELECT id FROM public.students 
        WHERE student_group = NEW.group_name AND faculty_id = NEW.faculty_id
    LOOP
        -- Insert enrollment if not exists
        INSERT INTO public.enrollments (student_id, class_id)
        VALUES (student_rec.id, target_class_id)
        ON CONFLICT DO NOTHING; -- Assuming unique constraint (student_id, class_id) or primary key
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Auto Enrollment
DROP TRIGGER IF EXISTS on_timetable_enrollment ON public.timetable;
CREATE TRIGGER on_timetable_enrollment
AFTER INSERT OR UPDATE ON public.timetable
FOR EACH ROW EXECUTE FUNCTION public.sync_enrollments_from_timetable();


-- 3. Function to Generate Attendance Sessions
CREATE OR REPLACE FUNCTION public.generate_attendance_sessions(
    inp_faculty_id UUID,
    start_date DATE,
    end_date DATE
)
RETURNS VOID AS $$
DECLARE
    t_rec RECORD;
    curr_date DATE;
    day_name TEXT;
BEGIN
    -- Validate dates
    IF start_date > end_date THEN
        RAISE EXCEPTION 'Start date must be before end date';
    END IF;

    -- Loop through every day in the range
    curr_date := start_date;
    WHILE curr_date <= end_date LOOP
        -- Get day name (e.g., 'Monday')
        day_name := trim(to_char(curr_date, 'Day'));

        -- Find all timetable entries for this day
        FOR t_rec IN 
            SELECT * FROM public.timetable 
            WHERE faculty_id = inp_faculty_id AND day = day_name
        LOOP
            -- Insert attendance session if not exists
            INSERT INTO public.attendance_sessions (
                faculty_id, subject_id, group_name, class_type, lecturer_id, 
                date, start_time, end_time, room
            )
            VALUES (
                inp_faculty_id, t_rec.subject_id, t_rec.group_name, t_rec.class_type, t_rec.lecturer_id,
                curr_date, t_rec.start_time, t_rec.end_time, t_rec.room
            );
        END LOOP;

        curr_date := curr_date + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
