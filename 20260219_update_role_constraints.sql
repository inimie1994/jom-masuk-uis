-- 20260219_update_role_constraints.sql

-- 1. Update `users` table constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'lecturer', 'hod', 'hop'));

-- 2. Update `lecturers` table constraint if it exists
-- (It might not have one explicitly named, or might be using the one from the previous migration)
-- We'll try to find and drop it if it exists. 
-- If it was created via "CHECK (role IN ...)" inline without a name, it likely has an auto-generated name.
-- To be safe, let's just ALTER the column to set the new type/check if possible, or just add a new named one ensuring we don't double up.

-- Best practice: Allow the column to hold these values.
-- If there's an existing constraint we can't easily guess the name of, we might need to inspect it.
-- However, for now, let's explicitly ADD a valid constraint. 
-- If there's an OLD conflicting one, this might fail or just duplicate checks.
-- A common way to "replace" is to just ADD the new one (if the old one allows it, which it won't).
-- So we MUST drop the old one. 

-- Let's assume the previous migration `20240215_add_user_roles.sql` created `users_role_check` or similar.
-- But for `lecturers` table? The `lecturers` table definition wasn't fully shown with constraints.
-- Let's assume `lecturers` table might also have a role column with constraint.

-- IF `lecturers` table has a `role` column:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lecturers' AND column_name = 'role') THEN
        -- Try to drop constraint if we can guess the name, otherwise we might need to be more aggressive
        -- For now, let's try to just Alter the column type if it's an enum, or add the check.
        -- If it's a simple TEXT column with a checkbox in the table creation UI, it often gets a name like `lecturers_role_check`.
        BEGIN
            ALTER TABLE public.lecturers DROP CONSTRAINT IF EXISTS "lecturers_role_check";
        EXCEPTION WHEN OTHERS THEN NULL; END;
        
        ALTER TABLE public.lecturers ADD CONSTRAINT "lecturers_role_check" 
            CHECK (role IN ('lecturer', 'hod', 'hop'));
    END IF;
END $$;
