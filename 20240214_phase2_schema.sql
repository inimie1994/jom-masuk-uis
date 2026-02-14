-- Create tables for academic system

-- 1. Function to handle trigger for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Faculties Table
CREATE TABLE public.faculties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER handle_faculties_updated_at
BEFORE UPDATE ON public.faculties
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 3. Users Profile Table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'student' CHECK (role IN ('admin', 'lecturer', 'student')),
  faculty_id UUID REFERENCES public.faculties(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER handle_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4. Students Table
CREATE TABLE public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  matric_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  faculty_id UUID REFERENCES public.faculties(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER handle_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- 5. Subjects Table
CREATE TABLE public.subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3,
  faculty_id UUID REFERENCES public.faculties(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, faculty_id)
);

CREATE TRIGGER handle_subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- 6. Classes Table
CREATE TABLE public.classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  section TEXT NOT NULL,
  semester TEXT NOT NULL,
  faculty_id UUID REFERENCES public.faculties(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER handle_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- 7. Enrollments Table
CREATE TABLE public.enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);


-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Faculties: Readable by everyone (authenticated), insertable only by service_role (manual setup first)
CREATE POLICY "Enable read access for all users" ON public.faculties
FOR SELECT USING (auth.role() = 'authenticated');


-- Users: Users can read their own profile. Admins can read all profiles in their faculty.
CREATE POLICY "Users can read own profile" ON public.users
FOR SELECT USING (auth.uid() = id);

-- Admin read policy for users (complex check avoid recursion by not querying users table inside itself directly if possible, or assume admin role is in JWT or just use basic check)
-- Simplification: If you are an admin, you can do anything.
-- But we need to know IF the current user is an admin.
-- We can use a secure function or just trust the claim if we set custom claims.
-- For now, let's use a subquery approach with security definer view or just querying the table (perf hit but ok for MVP).

CREATE POLICY "Admins can view all users in their faculty" ON public.users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE u.id = auth.uid() AND u.role = 'admin' AND u.faculty_id = public.users.faculty_id
  )
);


-- Generic Policy Function for Admin Access
-- Returns true if the current user is an admin of the given faculty_id
CREATE OR REPLACE FUNCTION is_admin_of(faculty_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND faculty_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Students Policies
CREATE POLICY "Admins can view students in their faculty" ON public.students
FOR SELECT USING (is_admin_of(faculty_id));

CREATE POLICY "Admins can insert students in their faculty" ON public.students
FOR INSERT WITH CHECK (is_admin_of(faculty_id));

CREATE POLICY "Admins can update students in their faculty" ON public.students
FOR UPDATE USING (is_admin_of(faculty_id));

CREATE POLICY "Admins can delete students in their faculty" ON public.students
FOR DELETE USING (is_admin_of(faculty_id));


-- Subjects Policies
CREATE POLICY "Admins can view subjects in their faculty" ON public.subjects
FOR SELECT USING (is_admin_of(faculty_id));

CREATE POLICY "Admins can insert subjects in their faculty" ON public.subjects
FOR INSERT WITH CHECK (is_admin_of(faculty_id));

CREATE POLICY "Admins can update subjects in their faculty" ON public.subjects
FOR UPDATE USING (is_admin_of(faculty_id));

CREATE POLICY "Admins can delete subjects in their faculty" ON public.subjects
FOR DELETE USING (is_admin_of(faculty_id));


-- Classes Policies
CREATE POLICY "Admins can view classes in their faculty" ON public.classes
FOR SELECT USING (is_admin_of(faculty_id));

CREATE POLICY "Admins can insert classes in their faculty" ON public.classes
FOR INSERT WITH CHECK (is_admin_of(faculty_id));

CREATE POLICY "Admins can update classes in their faculty" ON public.classes
FOR UPDATE USING (is_admin_of(faculty_id));

CREATE POLICY "Admins can delete classes in their faculty" ON public.classes
FOR DELETE USING (is_admin_of(faculty_id));


-- Enrollments Policies
-- Ideally, enrollments belong to a class, which belongs to a faculty.
-- We can join to check faculty_id.
CREATE POLICY "Admins can view enrollments in their faculty" ON public.enrollments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = class_id AND is_admin_of(faculty_id)
  )
);

CREATE POLICY "Admins can insert enrollments in their faculty" ON public.enrollments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = class_id AND is_admin_of(faculty_id)
  )
);

CREATE POLICY "Admins can delete enrollments in their faculty" ON public.enrollments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = class_id AND is_admin_of(faculty_id)
  )
);
