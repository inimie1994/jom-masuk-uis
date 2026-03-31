import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data: courses, error: err1 } = await supabase.from('courses').select('*').limit(1);
    console.log('Courses table exists?', err1 ? err1.message : 'Yes, columns: ' + Object.keys(courses[0] || {}).join(', '));
    
    // we also need the columns of content_pages
    const { data: pages, error: err2 } = await supabase.from('content_pages').select('*').limit(1);
    console.log('Content pages table exists?', err2 ? err2.message : 'Yes, columns: ' + Object.keys(pages[0] || {}).join(', '));
}

checkSchema();
