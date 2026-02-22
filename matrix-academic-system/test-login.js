import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unszsmrbvhvommvhhrck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuc3pzbXJidmh2b21tdmhocmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTkyNzIsImV4cCI6MjA4NjU3NTI3Mn0.9_Wyrf0bQnCOqBWiWcBebSEHQx6_tncge99bvQ7pkbY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
    console.log('Attempting to login as adminmatrik@matrix-system.com...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'adminmatrik@matrix-system.com',
        password: 'm@trikulasiuis',
    });

    if (error) {
        console.error('Login Error:', error);
    } else {
        console.log('Login Success! User ID:', data.user.id);

        console.log('Querying public.users...');
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('Profile Error:', profileError);
        } else {
            console.log('Profile:', profile);

            if (profile.faculty_id) {
                console.log('Querying public.faculties...');
                const { data: faculty, error: facultyError } = await supabase
                    .from('faculties')
                    .select('name, logo_url, semester_name')
                    .eq('id', profile.faculty_id)
                    .single();
                if (facultyError) {
                    console.error('Faculty Error:', facultyError);
                } else {
                    console.log('Faculty:', faculty);
                }
            }
        }
    }
}

testLogin();
