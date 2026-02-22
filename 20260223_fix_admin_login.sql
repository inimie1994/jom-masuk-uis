-- ==========================================
-- FULL ADMIN FIX SCRIPT - Run this in Supabase SQL Editor
-- ==========================================

-- STEP 1: Make sure the role constraint allows 'superadmin'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('superadmin', 'admin', 'lecturer', 'hod', 'hop', 'student'));

-- STEP 2: Promote the Google user to superadmin role
UPDATE public.users 
SET role = 'superadmin' 
WHERE email = 'muhamadhilmeeizanee@gmail.com';

UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role":"superadmin"}'::jsonb 
WHERE email = 'muhamadhilmeeizanee@gmail.com';

-- STEP 3: Recreate adminmatrik@matrix-system.com properly
DO $$
DECLARE
    v_faculty_id UUID;
    v_user_id UUID;
    v_email TEXT := 'adminmatrik@matrix-system.com';
    v_password TEXT := 'm@trikulasiuis';
BEGIN
    -- Clean up any existing broken records
    DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = v_email);
    DELETE FROM auth.users WHERE email = v_email;
    DELETE FROM public.users WHERE email = v_email;

    -- Find the faculty (case-insensitive, partial match for safety)
    SELECT id INTO v_faculty_id FROM public.faculties 
    WHERE name ILIKE '%matrik%' 
    LIMIT 1;
    
    IF v_faculty_id IS NULL THEN
        -- Find any faculty and use the first one, or create entry without faculty
        SELECT id INTO v_faculty_id FROM public.faculties LIMIT 1;
        RAISE NOTICE 'No Matrikulasi faculty found. Using first available faculty: %', v_faculty_id;
    END IF;

    -- Generate a new UUID for this user
    v_user_id := gen_random_uuid();
    
    -- Insert into Supabase Auth users table
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        is_super_admin, created_at, updated_at, confirmation_token,
        recovery_token, email_change_token_new, email_change
    )
    VALUES (
        v_user_id, 
        '00000000-0000-0000-0000-000000000000', 
        'authenticated', 
        'authenticated', 
        v_email, 
        crypt(v_password, gen_salt('bf')),
        now(),  -- mark email as already confirmed
        '{"provider":"email","providers":["email"]}'::jsonb, 
        '{"role":"admin"}'::jsonb,
        FALSE, 
        now(), 
        now(),
        '', '', '', ''
    );

    -- CRITICAL: Insert the identity record (missing this causes the 500 error)
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, 
        last_sign_in_at, created_at, updated_at
    )
    VALUES (
        gen_random_uuid(), 
        v_user_id, 
        v_email,  -- <-- use email as provider_id for email provider
        jsonb_build_object(
            'sub', v_user_id::text,
            'email', v_email,
            'email_verified', true,
            'phone_verified', false
        ),
        'email', 
        now(), now(), now()
    );

    -- Insert into public users profile table
    INSERT INTO public.users (id, email, role, faculty_id)
    VALUES (v_user_id, v_email, 'admin', v_faculty_id)
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', faculty_id = v_faculty_id;

    RAISE NOTICE 'SUCCESS: adminmatrik user created with ID: %', v_user_id;
    RAISE NOTICE 'Faculty linked: %', v_faculty_id;
END $$;

-- STEP 4: Fix recursive/broken RLS policies on the users table
-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Admins can view all users in their faculty" ON public.users;
DROP POLICY IF EXISTS "Admins can claim new users" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins see everyone" ON public.users;
DROP POLICY IF EXISTS "Admins update everyone" ON public.users;
DROP POLICY IF EXISTS "Admins and Superadmins see users" ON public.users;
DROP POLICY IF EXISTS "Admins and Superadmins update users" ON public.users;
DROP POLICY IF EXISTS "Superadmins can see everyone" ON public.users;
DROP POLICY IF EXISTS "Admins can see everyone" ON public.users;
DROP POLICY IF EXISTS "Superadmins can update everyone" ON public.users;
DROP POLICY IF EXISTS "Admins can update everyone" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.users;

-- Non-recursive, JWT-based policies (avoids the 500 error)
CREATE POLICY "Own profile read" ON public.users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin and superadmin can read all users" ON public.users 
    FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admin and superadmin can update users" ON public.users 
    FOR UPDATE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admin and superadmin can insert users" ON public.users
    FOR INSERT WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

-- STEP 5: Reload the schema so PostgREST picks up the changes
NOTIFY pgrst, 'reload schema';

-- STEP 6: Verify - check what was created
SELECT 
    au.email,
    au.email_confirmed_at,
    au.raw_user_meta_data ->> 'role' AS auth_role,
    pu.role AS public_role,
    f.name AS faculty_name,
    (SELECT COUNT(*) FROM auth.identities ai WHERE ai.user_id = au.id) AS identity_count
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
LEFT JOIN public.faculties f ON f.id = pu.faculty_id
WHERE au.email IN ('adminmatrik@matrix-system.com', 'muhamadhilmeeizanee@gmail.com');
