
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
    const { data, error } = await supabase
        .from('lecturers')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error fetching lecturers:', error);
    } else if (data && data.length > 0) {
        console.log('Columns in lecturers:', Object.keys(data[0]));
    } else {
        console.log('No data in lecturers table, trying to get schema via RPC if exists...');
    }
}

checkColumns();
