-- Master Fix Script for Pusat Matrikulasi Admin

DO $$
DECLARE
    v_faculty_id UUID;
    v_user_id UUID;
    v_email TEXT := 'adminmatrik@matrix-system.com';
    v_password TEXT := 'm@trikulasiuis';
BEGIN
    -- 1. DELETE ANY BROKEN VERSIONS of the user
    DELETE FROM auth.users WHERE email = v_email;
    DELETE FROM public.users WHERE email = v_email;

    -- 2. GET FACULTY ID
    SELECT id INTO v_faculty_id FROM public.faculties 
    WHERE name ILIKE 'PUSAT MATRIKULASI' LIMIT 1;
    
    IF v_faculty_id IS NULL THEN
        RAISE EXCEPTION 'Faculty PUSAT MATRIKULASI not found. Create it first.';
    END IF;

    -- 3. CREATE THE USER IN AUTH.USERS
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

    -- 4. CREATE THE IDENTITY IN AUTH.IDENTITIES (THIS fixes the "Database error querying schema" 500 crash)
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, created_at, updated_at
    )
    VALUES (
        gen_random_uuid(), v_user_id, v_user_id::text, 
        format('{"sub":"%s","email":"%s","email_verified":false,"phone_verified":false}', v_user_id, v_email)::jsonb, 
        'email', now(), now()
    );

    -- 5. UPSERT INTO PUBLIC.USERS
    INSERT INTO public.users (id, email, role, faculty_id)
    VALUES (v_user_id, v_email, 'admin', v_faculty_id)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', faculty_id = v_faculty_id;

    RAISE NOTICE 'Admin user completely reconstructed and fixed!';
END $$;


-- 6. REPLACE RECURSIVE POLICIES (Also major cause of schema errors)
DROP POLICY IF EXISTS "Admins can view all users in their faculty" ON public.users;
DROP POLICY IF EXISTS "Admins can claim new users" ON public.users;

CREATE POLICY "Admins see everyone" ON public.users
    FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR 
        (auth.uid() = id)
    );

CREATE POLICY "Admins update everyone" ON public.users
    FOR UPDATE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- 7. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
