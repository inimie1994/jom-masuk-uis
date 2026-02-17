-- Add semester dates to faculties
ALTER TABLE public.faculties
ADD COLUMN IF NOT EXISTS semester_start_date DATE,
ADD COLUMN IF NOT EXISTS semester_end_date DATE;

-- Create holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    faculty_id UUID REFERENCES public.faculties(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(faculty_id, date)
);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Policies for Holidays

-- View: All authenticated users in the same faculty can view holidays
CREATE POLICY "Users can view holidays in their faculty" ON public.holidays
FOR SELECT
USING (
    faculty_id IN (
        SELECT faculty_id FROM public.users WHERE id = auth.uid()
    )
);

-- Manage: Only Admins of the faculty can insert/update/delete
-- Reusing is_admin_of() function if available, otherwise inline check
-- Assuming is_admin_of is available from previous schema, but to be safe/standalone:

CREATE POLICY "Admins can insert holidays" ON public.holidays
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() 
        AND role = 'admin' 
        AND faculty_id = public.holidays.faculty_id
    )
);

CREATE POLICY "Admins can update holidays" ON public.holidays
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() 
        AND role = 'admin' 
        AND faculty_id = public.holidays.faculty_id
    )
);

CREATE POLICY "Admins can delete holidays" ON public.holidays
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() 
        AND role = 'admin' 
        AND faculty_id = public.holidays.faculty_id
    )
);

-- Also need to allow Admins to update semester dates in faculties table
-- 'faculties' table already has RLS enabled.
-- We need to ensure there is a policy allowing update.
-- Existing policy might be: "Enable read access for all users".
-- We need: "Admins can update their own faculty"

CREATE POLICY "Admins can update their own faculty" ON public.faculties
FOR UPDATE USING (
    id IN (
        SELECT faculty_id FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    id IN (
        SELECT faculty_id FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);
