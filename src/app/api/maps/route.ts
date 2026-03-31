import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('campus_maps')
            .select('map_id, name, created_at')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching maps list:', error);
            return NextResponse.json({ error: 'Failed to fetch maps list' }, { status: 500 });
        }

        return NextResponse.json({ maps: data });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name } = await request.json();
        
        // Default 10x10 grass grid
        const defaultGrid = Array(10).fill(0).map(() => Array(10).fill(0));

        const { data, error } = await supabase
            .from('campus_maps')
            .insert({
                name: name || 'New Map',
                grid_data: defaultGrid,
                npcs_data: [],
                event_grids_data: []
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating map:', error);
            return NextResponse.json({ error: 'Failed to create map' }, { status: 500 });
        }

        return NextResponse.json({ map: data });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
