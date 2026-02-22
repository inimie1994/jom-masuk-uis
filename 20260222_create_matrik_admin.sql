-- Creation of Admin User for Pusat Matrikulasi
-- User: adminmatrik@matrix-system.com
-- Password: m@trikulasiuis

DO $$
DECLARE
    v_faculty_id UUID;
    v_user_id UUID;
    v_email TEXT := 'adminmatrik@matrix-system.com';
    v_password TEXT := 'm@trikulasiuis';
BEGIN
    -- 1. Find the faculty ID for Pusat Matrikulasi
    SELECT id INTO v_faculty_id FROM public.faculties WHERE name = 'PUSAT MATRIKULASI' OR name = 'Pusat Matrikulasi' LIMIT 1;
    
    IF v_faculty_id IS NULL THEN
        RAISE EXCEPTION 'Faculty "PUSAT MATRIKULASI" not found. Please create it first or check the name.';
    END IF;

    -- 2. Create the user in auth.users if they don't exist
    -- Note: We use gen_random_uuid() for the ID. 
    -- We assume the crypt extension is available via pgcrypto which is standard in Supabase.
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        INSERT INTO auth.users (
            instance_id, 
            id, 
            aud, 
            role, 
            email, 
            encrypted_password, 
            email_confirmed_at, 
            last_sign_in_at, 
            raw_app_meta_data, 
            raw_user_meta_data, 
            is_super_admin, 
            created_at, 
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            v_email,
            extensions.crypt(v_password, extensions.gen_salt('bf')),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"role":"admin"}',
            FALSE,
            now(),
            now(),
            '',
            '',
            '',
            ''
        )
        RETURNING id INTO v_user_id;

        -- 3. The trigger 'on_auth_user_created' might have already created a record in public.users
        -- with role 'student' (based on public.handle_new_user definition).
        -- We wait a millisecond or just update it if exists, or insert if not.
        
        -- Use ON CONFLICT because of the trigger, or just update.
        INSERT INTO public.users (id, email, role, faculty_id)
        VALUES (v_user_id, v_email, 'admin', v_faculty_id)
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', faculty_id = v_faculty_id;
        
        RAISE NOTICE 'Admin user % created and linked to faculty %', v_email, v_faculty_id;
    ELSE
        -- Update existing user to be sure they have the right role and faculty
        SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
        
        UPDATE public.users 
        SET role = 'admin', faculty_id = v_faculty_id
        WHERE id = v_user_id;
        
        RAISE NOTICE 'Admin user % already existed. Role and faculty updated.', v_email;
    END IF;
END $$;
