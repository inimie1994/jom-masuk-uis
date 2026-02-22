-- Delete the broken user (and their identity missing fragments)
DELETE FROM auth.users WHERE email IN ('adminmatrik@matrix-system.com', 'adminmatrik2@matrix-system.com');
DELETE FROM public.users WHERE email IN ('adminmatrik@matrix-system.com', 'adminmatrik2@matrix-system.com');
