-- ==========================================
-- SUPERADMIN SETUP & RLS FIX v2
-- ==========================================

-- 1. ADD SUPERADMIN ROLE TO CONSTRAINTS
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('superadmin', 'admin', 'lecturer', 'hod', 'hop', 'student'));

-- 2. UPDATE THE GOOGLE USER TO SUPERADMIN
UPDATE public.users 
SET role = 'superadmin' 
WHERE email = 'muhamadhilmeeizanee@gmail.com';

UPDATE auth.users 
SET raw_user_meta_data = '{"role":"superadmin"}'::jsonb 
WHERE email = 'muhamadhilmeeizanee@gmail.com';

-- 3. RECREATE PUSAT MATRIKULASI ADMIN PROPERLY
DO $$
DECLARE
    v_faculty_id UUID;
    v_user_id UUID;
    v_email TEXT := 'adminmatrik@matrix-system.com';
    v_password TEXT := 'm@trikulasiuis';
BEGIN
    DELETE FROM auth.users WHERE email = v_email;
    DELETE FROM public.users WHERE email = v_email;

    SELECT id INTO v_faculty_id FROM public.faculties 
    WHERE name ILIKE 'PUSAT MATRIKULASI' LIMIT 1;
    
    IF v_faculty_id IS NULL THEN
        RAISE EXCEPTION 'Faculty PUSAT MATRIKULASI not found. Create it first.';
    END IF;

    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        is_super_admin, created_at, updated_at
    )
    VALUES (
        v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
        v_email, crypt(v_password, gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}', 
        '{"role":"admin"}', FALSE, now(), now()
    );

    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, created_at, updated_at
    )
    VALUES (
        gen_random_uuid(), v_user_id, v_user_id::text, 
        format('{"sub":"%s","email":"%s","email_verified":false,"phone_verified":false}', v_user_id, v_email)::jsonb, 
        'email', now(), now()
    );

    INSERT INTO public.users (id, email, role, faculty_id)
    VALUES (v_user_id, v_email, 'admin', v_faculty_id)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', faculty_id = v_faculty_id;

    RAISE NOTICE 'Adminmatrik reconstructed successfully!';
END $$;

-- 4. FIX ALL RECURSIVE / RESTRICTIVE RLS POLICIES FOR ADMINS & SUPERADMINS

-- Users Table
DROP POLICY IF EXISTS "Admins can view all users in their faculty" ON public.users;
DROP POLICY IF EXISTS "Admins can claim new users" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins see everyone" ON public.users;
DROP POLICY IF EXISTS "Admins update everyone" ON public.users;
DROP POLICY IF EXISTS "Admins and Superadmins see users" ON public.users;
DROP POLICY IF EXISTS "Admins and Superadmins update users" ON public.users;

-- Safe non-recursive policies
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Superadmins can see everyone" ON public.users FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin');
CREATE POLICY "Admins can see everyone" ON public.users FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Superadmins can update everyone" ON public.users FOR UPDATE USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin');
CREATE POLICY "Admins can update everyone" ON public.users FOR UPDATE USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 5. APPLY SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';
