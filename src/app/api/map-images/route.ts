import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const mapDirectory = path.join(process.cwd(), 'public', 'map');
        
        if (!fs.existsSync(mapDirectory)) {
            return NextResponse.json({ images: [] });
        }

        const files = fs.readdirSync(mapDirectory);
        const images = files
            .filter(file => file.match(/\.(png|jpe?g|gif|webp)$/i))
            .map(file => ({
                label: file.replace(/\.[^/.]+$/, ""), // filename without extension
                value: `/map/${file}` // path for public consumption
            }));

        return NextResponse.json({ images });
    } catch (error) {
        console.error('Error reading map directory:', error);
        return NextResponse.json({ error: 'Failed to load map images' }, { status: 500 });
    }
}
