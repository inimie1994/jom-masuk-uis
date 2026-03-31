import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const mapId = (await params).id;

        // Perform concurrent fetch for optimized performance
        const [mapResponse, tilesResponse] = await Promise.all([
            supabase
                .from('campus_maps')
                .select('name, grid_data, npcs_data, event_grids_data, background_image')
                .eq('map_id', mapId)
                .single(),
            supabase
                .from('tiles')
                .select('*')
        ]);

        if (mapResponse.error) {
            console.error('Error fetching map:', mapResponse.error);
            return NextResponse.json({ error: 'Failed to fetch map data' }, { status: 500 });
        }

        if (tilesResponse.error) {
            console.error('Error fetching tiles:', tilesResponse.error);
            return NextResponse.json({ error: 'Failed to fetch tiles data' }, { status: 500 });
        }

        // Convert tiles array into a dictionary map for O(1) lookups on the frontend
        const tileDictionary = tilesResponse.data.reduce((acc: Record<number, any>, tile: any) => {
            acc[tile.tile_id] = tile;
            return acc;
        }, {} as Record<number, any>);

        return NextResponse.json({
            name: mapResponse.data.name,
            grid: mapResponse.data.grid_data,
            npcs: mapResponse.data.npcs_data || [],
            eventGrids: mapResponse.data.event_grids_data || [],
            tiles: tileDictionary,
            background_image: mapResponse.data.background_image
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const mapId = (await params).id;
        const body = await request.json();

        const { error } = await supabase
            .from('campus_maps')
            .update({
                grid_data: body.grid_data,
                npcs_data: body.npcs_data,
                event_grids_data: body.event_grids_data,
                background_image: body.background_image
            })
            .eq('map_id', mapId);

        if (error) {
            console.error('Error updating map:', error);
            return NextResponse.json({ error: 'Failed to update map data' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
