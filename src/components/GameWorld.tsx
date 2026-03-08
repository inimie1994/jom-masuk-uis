"use client";

import { useState, useEffect, useRef } from 'react';
import { usePlayerMovement } from '@/hooks/usePlayerMovement';
import { useCharacterAnimation } from '@/hooks/useCharacterAnimation';
import FacultyModal from './FacultyModal';
import MobileControls from './MobileControls';
import { supabase } from '@/lib/supabase';

const BASE_TILE_SIZE = 48;

type TileDefinition = {
    tile_id: number;
    label: string;
    is_collidable: boolean;
    is_trigger: boolean;
    sprite_url?: string;
    metadata: any;
};

export default function GameWorld() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Dynamic Map State
    const [mapName, setMapName] = useState<string>("Loading...");
    const [gridData, setGridData] = useState<number[][]>([]);
    const [tilesData, setTilesData] = useState<Record<number, TileDefinition>>({});
    const [isLoading, setIsLoading] = useState(true);

    const [modalData, setModalData] = useState<{ isOpen: boolean; title: string; description: string; isQuest: boolean }>({
        isOpen: false,
        title: "",
        description: "",
        isQuest: false
    });

    // Fetch Map on Mount
    useEffect(() => {
        const fetchMap = async () => {
            try {
                // Hardcoding map ID 1 for now
                const res = await fetch('/api/map/1');
                if (!res.ok) throw new Error('Network response was not ok');

                const data = await res.json();
                setMapName(data.name);
                setGridData(data.grid);
                setTilesData(data.tiles);
            } catch (error) {
                console.error("Failed to fetch map data:", error);
                // Fallback map if database fails
                setGridData([
                    [1, 1, 1, 1, 1],
                    [1, 0, 0, 3, 1],
                    [1, 1, 1, 1, 1]
                ]);
                setTilesData({
                    0: { tile_id: 0, label: 'Grass', is_collidable: false, is_trigger: false, metadata: {} },
                    1: { tile_id: 1, label: 'Wall', is_collidable: true, is_trigger: false, metadata: {} },
                    3: { tile_id: 3, label: 'Trigger', is_collidable: false, is_trigger: true, metadata: {} },
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchMap();
    }, []);

    const handleInteraction = async (x: number, y: number, tileDef: TileDefinition) => {
        // If the tile has specific metadata for an interaction, prefer that over random querying
        if (tileDef.metadata && tileDef.metadata.description) {
            setModalData({
                isOpen: true,
                title: tileDef.label,
                description: tileDef.metadata.description,
                isQuest: false,
            });
            return;
        }

        // Fallback or advanced fetching logic
        try {
            const { data, error } = await supabase
                .from('npc_data')
                .select('*')
                .eq('tile_type', tileDef.tile_id)
                .limit(1)
                .single();

            if (data && !error) {
                setModalData({
                    isOpen: true,
                    title: data.faculty_name || tileDef.label || "Notification",
                    description: data.content,
                    isQuest: data.quest_id ? true : false,
                });
            } else {
                throw error || new Error('No data');
            }
        } catch (err) {
            setModalData({
                isOpen: true,
                title: tileDef.label || "System",
                description: "You interacted with this object, but nothing happened.",
                isQuest: false,
            });
        }
    };

    const { position, direction, isMoving, moveIfValid } = usePlayerMovement({ x: 29, y: 35 }, gridData, tilesData, handleInteraction);

    const currentFrame = useCharacterAnimation(direction, isMoving);

    const handleMobileMove = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
        switch (dir) {
            case 'UP': moveIfValid(0, -1); break;
            case 'DOWN': moveIfValid(0, 1); break;
            case 'LEFT': moveIfValid(-1, 0); break;
            case 'RIGHT': moveIfValid(1, 0); break;
        }
    };

    // Effect to handle responsive scaling
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current && gridData.length > 0) {
                const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
                const gameWidth = gridData[0].length * BASE_TILE_SIZE;
                const newScale = Math.min(1, (parentWidth - 48) / gameWidth);
                setScale(newScale);
            }
        };

        window.addEventListener('resize', updateScale);
        updateScale(); // Call immediately when grid changes

        return () => window.removeEventListener('resize', updateScale);
    }, [gridData]);

    if (isLoading) {
        return <div className="text-white animate-pulse">Loading Map Data...</div>;
    }

    if (gridData.length === 0) {
        return <div className="text-red-500">Error loading map.</div>;
    }

    const tileCountX = gridData[0].length;
    const tileCountY = gridData.length;

    // Helper to map tile type to background position in tileset
    const getTileStyle = (tileId: number) => {
        const base = { width: BASE_TILE_SIZE, height: BASE_TILE_SIZE };
        const tileDef = tilesData[tileId];

        // Use sprite URL if available
        if (tileDef?.sprite_url) {
            return {
                ...base,
                backgroundImage: `url(${tileDef.sprite_url})`,
                backgroundSize: 'cover'
            };
        }

        // Fallback colors for default definitions
        switch (tileId) {
            case 0: return { ...base, backgroundColor: 'transparent' }; // Grass / Empty space
            case 1: return { ...base, backgroundColor: 'rgba(255, 0, 0, 0.2)' }; // Wall
            case 2: return { ...base, backgroundColor: 'rgba(255, 255, 0, 0.2)' }; // Path
            case 3: return { ...base, backgroundColor: 'rgba(0, 0, 255, 0.2)' }; // Interaction
            default: return { ...base, backgroundColor: 'transparent' };
        }
    };

    return (
        <div className="flex flex-col items-center w-full" ref={containerRef}>
            <div className="absolute top-4 font-bold text-white/50 text-xs tracking-widest uppercase z-20">
                {mapName}
            </div>
            <div className="relative overflow-hidden bg-neutral-900 rounded-3xl border-8 border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-4 ring-neutral-700/30 transition-transform duration-300"
                style={{
                    width: tileCountX * BASE_TILE_SIZE,
                    height: tileCountY * BASE_TILE_SIZE,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    marginBottom: (tileCountY * BASE_TILE_SIZE * (scale - 1))
                }}>

                {/* Background Map Image */}
                <div
                    className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
                    style={{
                        backgroundImage: `url('/map/game%20map.png')`,
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat'
                    }}
                />

                {/* Render Map */}
                <div className="absolute top-0 left-0 w-full h-full game-container z-10">
                    {gridData.map((row, y) => (
                        <div key={y} className="flex">
                            {row.map((tileId, x) => (
                                <div
                                    key={`${x}-${y}`}
                                    style={getTileStyle(tileId)}
                                    className={`
                    flex items-center justify-center border-[0.5px] border-black/10 transition-colors duration-500
                    ${tilesData[tileId]?.is_trigger ? 'cursor-pointer hover:brightness-110' : ''}
                  `}
                                >
                                    {tilesData[tileId]?.is_trigger && (
                                        <div className="flex flex-col items-center">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce shadow-[0_0_8px_white]" />
                                            <div className="w-6 h-1 bg-black/30 blur-[1px] rounded-full scale-x-75" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Render Player Avatar */}
                <div
                    className="absolute transition-all duration-200 ease-out z-20 flex items-center justify-center pointer-events-none"
                    style={{
                        width: BASE_TILE_SIZE,
                        height: BASE_TILE_SIZE,
                        left: position.x * BASE_TILE_SIZE,
                        top: position.y * BASE_TILE_SIZE,
                    }}
                >
                    <img
                        src={`/characters/male/character-${currentFrame}.png`}
                        alt="Player character"
                        className="w-full h-full object-contain drop-shadow-lg"
                    />
                </div>
            </div>

            {/* Mobile Controls */}
            <MobileControls onMove={handleMobileMove} />

            <FacultyModal
                isOpen={modalData.isOpen}
                onClose={() => setModalData({ ...modalData, isOpen: false })}
                title={modalData.title}
                description={modalData.description}
                isQuest={modalData.isQuest}
            />
        </div>
    );
}
