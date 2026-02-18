
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_GROUPS = ['fa01 2a', 'fa01 2b', 'FA01 2A', 'FA01 2B'];

async function checkTable(tableName, column, isArray = false) {
    console.log(`Checking ${tableName}.${column} for ghosts...`);

    const { data, error } = await supabase.from(tableName).select('id, ' + column);

    if (error) {
        console.error(`Error querying ${tableName}:`, error.message);
        return;
    }

    let found = [];
    data.forEach(row => {
        const val = row[column];
        if (isArray && Array.isArray(val)) {
            const hasGhost = val.some(g => TARGET_GROUPS.some(tg => tg.toLowerCase() === (g || '').trim().toLowerCase()));
            if (hasGhost) {
                found.push({ id: row.id, value: val });
            }
        } else if (typeof val === 'string') {
            if (TARGET_GROUPS.some(tg => tg.toLowerCase() === (val || '').trim().toLowerCase())) {
                found.push({ id: row.id, value: val });
            }
        }
    });

    if (found.length > 0) {
        console.log(`[FOUND] ${tableName}: ${found.length} rows`);
        console.log(JSON.stringify(found, null, 2));
    } else {
        console.log(`[CLEAN] ${tableName}`);
    }
}

async function listAllGroups(tableName, column) {
    console.log(`Listing all groups in ${tableName}.${column}...`);
    const { data, error } = await supabase.from(tableName).select(column);
    if (error) {
        console.error(error.message);
        return;
    }

    const allGroups = new Set();
    data.forEach(row => {
        const val = row[column];
        if (Array.isArray(val)) {
            val.forEach(g => {
                if (g) allGroups.add(g.trim());
            });
        } else if (typeof val === 'string' && val) {
            allGroups.add(val.trim());
        }
    });

    console.log(`Distinct groups in ${tableName}:`, Array.from(allGroups).sort());
}

async function main() {
    console.log('Starting Ghost Group Search...');

    await listAllGroups('timetable', 'group_names');
    await listAllGroups('students', 'student_group');
    await listAllGroups('attendance_sessions', 'group_names');

    await checkTable('timetable', 'group_names', true);
    await checkTable('attendance_sessions', 'group_names', true);
    await checkTable('students', 'student_group', false);
    // await checkTable('classes', 'section', false); 
    await checkTable('workload', 'student_group', false);

    console.log('Done.');
}

main();
