import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Mock Supabase client to prevent crash if credentials are not yet set
const mockSupabase = {
    from: () => ({
        select: () => ({
            eq: () => ({
                limit: () => ({
                    single: async () => ({ data: null, error: { message: 'Supabase URL not configured' } })
                })
            })
        }),
        insert: async () => ({ data: null, error: { message: 'Supabase URL not configured' } })
    })
} as any;

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : mockSupabase;
