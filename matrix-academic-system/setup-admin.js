import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unszsmrbvhvommvhhrck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuc3pzbXJidmh2b21tdmhocmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTkyNzIsImV4cCI6MjA4NjU3NTI3Mn0.9_Wyrf0bQnCOqBWiWcBebSEHQx6_tncge99bvQ7pkbY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupAdmin() {
    const email = 'adminmatrik2@matrix-system.com';
    const password = 'm@trikulasiuis'; // Using a new email to bypass the broken user

    console.log('1. Signing up new user...');
    // We sign up normally. This uses GoTrue to properly populate auth.users AND auth.identities
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: 'admin'
            }
        }
    });

    if (signUpError) {
        console.error('Failed to sign up:', signUpError.message);
        return;
    }

    console.log('User signed up successfully!', signUpData.user.id);

    // The trigger public.handle_new_user() will have created a row in public.users with role 'student'.
    // However, we can't update it to 'admin' using supabase client here, because RLS prevents standard users
    // from upgrading their own privileges.
    // The user will need to run a small SQL query to fix the public user row.
}

setupAdmin();
