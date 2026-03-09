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
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [zoomOption, setZoomOption] = useState<'close' | 'medium' | 'far'>('medium');
    const [isCameraExpanded, setIsCameraExpanded] = useState(false);

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

    // Admin State
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [gridOpacity, setGridOpacity] = useState(0.5);
    const [selectedBrush, setSelectedBrush] = useState<number>(1); // Default to wall
    const [isPainting, setIsPainting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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

    const { position, direction, isMoving, moveIfValid, interact } = usePlayerMovement({ x: 29, y: 35 }, gridData, tilesData, handleInteraction);

    const currentFrame = useCharacterAnimation(direction, isMoving);

    const handleMobileMove = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
        switch (dir) {
            case 'UP': moveIfValid(0, -1); break;
            case 'DOWN': moveIfValid(0, 1); break;
            case 'LEFT': moveIfValid(-1, 0); break;
            case 'RIGHT': moveIfValid(1, 0); break;
        }
    };

    // Effect to handle viewport resizing for camera follow using ResizeObserver
    useEffect(() => {
        if (isLoading || !containerRef.current) return;

        const container = containerRef.current;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setViewportSize({ width, height });
                }
            }
        });

        observer.observe(container);

        // Initial capture
        const initialRect = container.getBoundingClientRect();
        if (initialRect.width > 0) {
            setViewportSize({
                width: initialRect.width,
                height: initialRect.height
            });
        }

        return () => observer.disconnect();
    }, [isLoading]);

    const handleSaveMap = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/map/1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grid_data: gridData }),
            });
            if (!res.ok) throw new Error('Failed to save');
            alert('Map saved successfully!');
        } catch (error) {
            console.error(error);
            alert('Error saving map');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePaint = (x: number, y: number) => {
        if (!isAdminMode) return;
        setGridData(prev => {
            const newGrid = [...prev];
            newGrid[y] = [...newGrid[y]];
            if (newGrid[y][x] !== selectedBrush) {
                newGrid[y][x] = selectedBrush;
            }
            return newGrid;
        });
    };

    if (isLoading) {
        return <div className="text-white animate-pulse">Loading Map Data...</div>;
    }

    if (gridData.length === 0) {
        return <div className="text-red-500">Error loading map.</div>;
    }

    const tileCountX = gridData[0].length;
    const tileCountY = gridData.length;

    // --- Camera Calculations ---
    const getZoomScale = () => {
        switch (zoomOption) {
            case 'close': return 2.0;
            case 'medium': return 1.0;
            case 'far': return 0.5;
            default: return 1.0;
        }
    };
    const scale = getZoomScale();

    // Center of viewport - fallback to screen-like width if not yet measured to prevent "far left" starts
    const vw = viewportSize.width || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const vh = viewportSize.height || (typeof window !== 'undefined' ? window.innerHeight : 600);
    const viewportCenterX = vw / 2;
    const viewportCenterY = vh / 2;

    // Player position in pixels (center of tile)
    const playerPxX = position.x * BASE_TILE_SIZE + BASE_TILE_SIZE / 2;
    const playerPxY = position.y * BASE_TILE_SIZE + BASE_TILE_SIZE / 2;

    // Calculate translation to center the player
    // Math: Translate = Center - (PlayerPos * Scale)
    const translateX = viewportCenterX - (playerPxX * scale);
    const translateY = viewportCenterY - (playerPxY * scale);
    // ---------------------------

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
        let color = 'transparent';
        switch (tileId) {
            case 0: color = 'transparent'; break; // Grass / Empty space
            case 1: color = `rgba(255, 0, 0, ${isAdminMode ? gridOpacity : 0})`; break; // Wall
            case 2: color = `rgba(255, 255, 0, ${isAdminMode ? gridOpacity : 0})`; break; // Path
            case 3: color = `rgba(0, 0, 255, ${isAdminMode ? gridOpacity : 0})`; break; // Interaction
        }

        return { ...base, backgroundColor: color };
    };

    return (
        <div
            className="w-full h-full relative bg-neutral-950 overflow-hidden select-none"
            ref={containerRef}
            onPointerUp={() => setIsPainting(false)}
            onPointerLeave={() => setIsPainting(false)}
        >
            {/* Top Right Floating Controls Label & UI */}
            <div className="absolute top-4 right-4 z-[100] flex flex-col items-end gap-3 pointer-events-none">

                {/* Game / Map Title */}
                <div className="font-bold text-white/50 text-[10px] tracking-[0.2em] uppercase bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                    {mapName}
                </div>

                {/* Control Column: Admin & Zoom */}
                <div className="flex flex-col items-end gap-2 pointer-events-none">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setIsAdminMode(!isAdminMode); }}
                        className={`pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-2xl border ${isAdminMode ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-black/60 border-white/20 hover:bg-black/80 text-white/80'}`}
                        title="Admin Editor Mode"
                    >
                        <div className={`w-2 h-2 rounded-full ${isAdminMode ? 'bg-white animate-pulse' : 'bg-red-500'}`} />
                        Admin
                    </button>

                    {/* Camera Controls */}
                    <div className="pointer-events-auto flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-2xl p-1.5 border border-white/20 shadow-2xl overflow-hidden transition-all duration-300">
                        {/* Camera Toggle Icon */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsCameraExpanded(!isCameraExpanded); }}
                            className={`flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-xl transition-colors ${isCameraExpanded ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-neutral-400'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>

                        {isCameraExpanded && (
                            <div className="flex items-center gap-1 animate-in slide-in-from-right-4 fade-in duration-200">
                                <div className="w-[1px] h-6 bg-white/20 mx-1" />
                                {(['close', 'medium', 'far'] as const).map(option => (
                                    <button
                                        key={option}
                                        onClick={() => setZoomOption(option)}
                                        className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold capitalize transition-all active:scale-95 ${zoomOption === option ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'hover:bg-white/10 text-neutral-400'}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Admin Panel Overlay */}
                {isAdminMode && (
                    <div className="pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/20 p-5 rounded-2xl flex flex-col gap-5 shadow-[0_30px_60px_rgba(0,0,0,0.6)] min-w-[240px] text-white animate-in slide-in-from-top-4 fade-in duration-200">
                        <h3 className="font-black text-lg text-red-400 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-red-500 rounded-full" />
                            Admin Space
                        </h3>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-neutral-400 tracking-wider flex justify-between">
                                <span>GRID OPACITY</span>
                                <span className="text-white">{Math.round(gridOpacity * 100)}%</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.1"
                                value={gridOpacity}
                                onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                                className="accent-red-500 h-1.5 bg-neutral-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-neutral-400 tracking-wider flex justify-between">
                                BRUSH
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setSelectedBrush(0)} className={`p-2 rounded-xl text-xs font-bold border transition-colors ${selectedBrush === 0 ? 'bg-white text-black border-white' : 'bg-neutral-900 border-white/10 text-neutral-400 hover:bg-neutral-800'}`}>0: Eraser</button>
                                <button onClick={() => setSelectedBrush(1)} className={`p-2 rounded-xl text-xs font-bold border transition-colors ${selectedBrush === 1 ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-neutral-900 border-white/10 text-neutral-400 hover:bg-red-900/40 hover:text-red-200'}`}>1: Wall</button>
                                <button onClick={() => setSelectedBrush(3)} className={`p-2 rounded-xl text-xs font-bold border transition-colors col-span-2 ${selectedBrush === 3 ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-neutral-900 border-white/10 text-neutral-400 hover:bg-blue-900/40 hover:text-blue-200'}`}>3: Trigger</button>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveMap}
                            disabled={isSaving}
                            className="mt-2 w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:from-neutral-700 disabled:to-neutral-800 disabled:text-neutral-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_10px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_15px_30px_rgba(34,197,94,0.4)] disabled:shadow-none active:scale-95"
                        >
                            {isSaving ? 'Saving map data...' : '💾 Save Map To Database'}
                        </button>
                    </div>
                )}
            </div>
            <div className="absolute top-0 left-0 bg-neutral-900 border-8 border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] ring-4 ring-neutral-700/30 transition-transform duration-200 ease-out z-10"
                style={{
                    width: tileCountX * BASE_TILE_SIZE,
                    height: tileCountY * BASE_TILE_SIZE,
                    transformOrigin: 'top left',
                    transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
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
                    flex items-center justify-center transition-colors duration-200
                    ${isAdminMode ? 'border-[0.5px] border-white/20' : 'border-transparent'}
                    ${tilesData[tileId]?.is_trigger ? 'cursor-pointer hover:brightness-110' : ''}
                  `}
                                    onPointerDown={(e) => {
                                        if (isAdminMode) {
                                            e.preventDefault(); // prevent touch scrolling
                                            setIsPainting(true);
                                            handlePaint(x, y);
                                        }
                                    }}
                                    onPointerEnter={() => {
                                        if (isAdminMode && isPainting) {
                                            handlePaint(x, y);
                                        }
                                    }}
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
            <MobileControls onMove={handleMobileMove} onInteract={interact} />

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
