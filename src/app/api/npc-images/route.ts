import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const npcDirectory = path.join(process.cwd(), 'assets', 'NPCs');
        
        if (!fs.existsSync(npcDirectory)) {
            return NextResponse.json({ images: [] });
        }

        const files = fs.readdirSync(npcDirectory);
        const images = files
            .filter(file => file.match(/\.(png|jpe?g|gif|webp)$/i))
            .map(file => ({
                label: file.replace(/\.[^/.]+$/, ""), // filename without extension
                value: file
            }));

        return NextResponse.json({ images });
    } catch (error) {
        console.error('Error reading NPC directory:', error);
        return NextResponse.json({ error: 'Failed to load NPC images' }, { status: 500 });
    }
}
