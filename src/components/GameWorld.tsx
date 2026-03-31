"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { usePlayerMovement } from '@/hooks/usePlayerMovement';
import { useCharacterAnimation, defaultAnimationMap, femaleAnimationMap } from '@/hooks/useCharacterAnimation';
import FacultyModal from './FacultyModal';
import MobileControls from './MobileControls';
import { ContentPageModal } from './ContentPageModal';
import DialogViewer from './DialogViewer';
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

interface GameWorldProps {
    gender: 'male' | 'female';
    isEditor?: boolean;
    mapId?: number;
    onMapUpdate?: (name: string) => void;
    onBackgroundImageChange?: (url: string) => void;
    onLoadMap?: (mapId: number) => void;
    playerIcNo?: string;
}

export default function GameWorld({ gender, isEditor = false, mapId = 1, onMapUpdate, onBackgroundImageChange, onLoadMap, playerIcNo }: GameWorldProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [zoomOption, setZoomOption] = useState<'close' | 'medium' | 'far'>('medium');
    const [isCameraExpanded, setIsCameraExpanded] = useState(false);

    // Dynamic Map State
    const [mapName, setMapName] = useState<string>("Loading...");
    const [gridData, setGridData] = useState<number[][]>([]);
    const [tilesData, setTilesData] = useState<Record<number, TileDefinition>>({});
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [modalData, setModalData] = useState<{ 
        isOpen: boolean; 
        title: string; 
        description: string; 
        isQuest: boolean;
        cta?: { enabled: boolean; text: string; link: string } 
    }>({
        isOpen: false,
        title: "",
        description: "",
        isQuest: false
    });

    const [activeContentPage, setActiveContentPage] = useState<any | null>(null);
    const [activeDialog, setActiveDialog] = useState<any | null>(null);

    const [eventGrids, setEventGrids] = useState<any[]>([]);
    const [npcs, setNpcs] = useState<any[]>([]);
    const [availableImages, setAvailableImages] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/map-images')
            .then(res => res.json())
            .then(data => setAvailableImages(data.images || []))
            .catch(err => console.error('Error fetching map images:', err));
    }, []);


    const [isAdminMode, setIsAdminMode] = useState(isEditor);
    const [gridOpacity, setGridOpacity] = useState(0.5);
    const [selectedBrush, setSelectedBrush] = useState<number>(1); // Default to wall
    const [isPainting, setIsPainting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

    // Editor Camera & Tooling
    const [toolMode, setToolMode] = useState<'pan' | 'paint'>(isEditor ? 'pan' : 'paint');
    const [editorCamera, setEditorCamera] = useState({ x: 29, y: 35 }); // Match player start
    const [isDragging, setIsDragging] = useState(false);
    const [lastPointerPos, setLastPointerPos] = useState({ x: 0, y: 0 });


    const [initialSpawnPoint, setInitialSpawnPoint] = useState({ x: 29, y: 35 });

    // ... (modal states etc)

    // Fetch Map on Mount
    useEffect(() => {
        const fetchMap = async () => {
            try {
                const res = await fetch(`/api/map/${mapId}`, { cache: 'no-store' });
                if (!res.ok) throw new Error('Network response was not ok');

                const data = await res.json();
                
                // Fetch LIVE definitions for events and NPCs to ensure we have latest transition links
                const [{ data: liveEvents }, { data: liveNPCs }] = await Promise.all([
                    supabase.from('event_grids').select('*, content_pages(*), dialog_sequences(*)').eq('is_active', true),
                    supabase.from('npc_data').select('*, dialog_sequences(*)')
                ]);

                // Merge Map Position with LIVE Config
                const mergedEvents = (data.eventGrids || []).map((mapGrid: any) => {
                    const live = liveEvents?.find((e: any) => e.tile_type === mapGrid.tile_type);
                    return live ? { ...live, x: mapGrid.x, y: mapGrid.y } : mapGrid;
                });

                const mergedNPCs = (data.npcs || []).map((mapNPC: any) => {
                    const live = liveNPCs?.find((n: any) => n.tile_type === mapNPC.tile_type);
                    return live ? { ...live, x: mapNPC.x, y: mapNPC.y } : mapNPC;
                });

                setMapName(data.name);
                setGridData(data.grid);
                setTilesData(data.tiles);
                setNpcs(mergedNPCs);
                setEventGrids(mergedEvents);
                setBackgroundImage(data.background_image || null);
                if (onBackgroundImageChange && data.background_image) onBackgroundImageChange(data.background_image);

                // Scan for spawn point (Tile ID 4)
                let spawnX = -1;
                let spawnY = -1;
                let found = false;
                data.grid.forEach((row: number[], y: number) => {
                    row.forEach((cell: number, x: number) => {
                        if (cell === 4) {
                            spawnX = x;
                            spawnY = y;
                            found = true;
                        }
                    });
                });

                if (found) {
                    console.log(`Spawn point found at: ${spawnX}, ${spawnY}`);
                    setInitialSpawnPoint({ x: spawnX, y: spawnY });
                    setEditorCamera({ x: spawnX, y: spawnY });
                } else {
                    console.log('No spawn point (tile 4) found, using default 29, 35');
                    // Fallback to legacy default if no spawn point defined in map
                    setInitialSpawnPoint({ x: 29, y: 35 });
                    setEditorCamera({ x: 29, y: 35 });
                }

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
    }, [mapId]);

    const saveInteraction = async (type: 'npc_dialog' | 'event_trigger', idRef: string | number) => {
        if (!playerIcNo) return;
        
        try {
            console.log(`Recording interaction: ${type} for ${idRef}`);
            const { error } = await supabase
                .from('player_progress')
                .upsert({
                    player_ic_no: playerIcNo,
                    interaction_type: type,
                    id_reference: idRef.toString(),
                    last_interacted_at: new Date().toISOString()
                }, {
                    onConflict: 'player_ic_no,interaction_type,id_reference'
                });

            if (error) throw error;
        } catch (err) {
            console.error('Error saving interaction:', err);
        }
    };


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

        // 1. Check for RPG Dialog (Highest priority)
        if (tileDef.metadata?.dialog_sequences) {
            setActiveDialog(tileDef.metadata.dialog_sequences);
            // If it's an NPC or has an ID, save it
            if (tileDef.metadata.id) {
                saveInteraction('npc_dialog', tileDef.metadata.id);
            }
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
                    cta: {
                        enabled: data.cta_enabled,
                        text: data.cta_text,
                        link: data.cta_link
                    }
                });
            } else {
                // Check if it's an event grid trigger tile (1001+)
                const eventGrid = eventGrids.find(g => g.tile_type === tileDef.tile_id);
                if (eventGrid) {
                    // Check for Load Map trigger first
                    if (eventGrid.grid_config?.target_map_id && onLoadMap) {
                        console.log('Interaction trigger: Loading map', eventGrid.grid_config.target_map_id);
                        onLoadMap(eventGrid.grid_config.target_map_id);
                        return;
                    }

                    if (eventGrid.dialog_sequences) {
                        setActiveDialog(eventGrid.dialog_sequences);
                        saveInteraction('event_trigger', eventGrid.id);
                    } else if (eventGrid.content_pages) {
                        setActiveContentPage(eventGrid.content_pages);
                        saveInteraction('event_trigger', eventGrid.id);
                    } else {
                        setModalData({
                            isOpen: true,
                            title: `Event: ${eventGrid.name}`,
                            description: `Welcome to the ${eventGrid.name} zone! You've unlocked a special reward: ${eventGrid.grid_config.rewards}.`,
                            isQuest: false
                        });
                        saveInteraction('event_trigger', eventGrid.id);
                    }
                } else {
                    throw error || new Error('No data');
                }
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

    const computedTiles = useMemo(() => {
        const base = { ...tilesData };
        
        // NPCs (101-999): Collidable & NOT Trigger in their own cell (auto-trigger when stepping below)
        npcs.forEach(npc => {
            if (npc.tile_type) {
                base[npc.tile_type] = {
                    tile_id: npc.tile_type,
                    label: npc.faculty_name,
                    is_collidable: true,
                    is_trigger: false, // Changed from true - we trigger from below
                    metadata: npc
                };
            }
        });

        // Event Grids (1001+): Not Collidable & Trigger
        eventGrids.forEach(grid => {
            if (grid.tile_type) {
                base[grid.tile_type] = {
                    tile_id: grid.tile_type,
                    label: grid.name,
                    is_collidable: false,
                    is_trigger: true,
                    metadata: grid
                };
            }
        });

        return base;
    }, [tilesData, npcs, eventGrids]);

    const { position, direction, isMoving, moveIfValid, interact } = usePlayerMovement(initialSpawnPoint, gridData, computedTiles, handleInteraction);
 
    // Sync editor camera with player start once map is loaded if we're in editor
    useEffect(() => {
        if (isEditor && position) {
            setEditorCamera({ x: position.x, y: position.y });
        }
    }, [isEditor, isLoading, position.x, position.y]);

    const [activeEventGrid, setActiveEventGrid] = useState<string | null>(null);

    // NPC Auto-trigger from below
    useEffect(() => {
        if (!position || gridData.length === 0) return;

        // Check the tile immediately ABOVE the player
        const tileAboveId = gridData[position.y - 1]?.[position.x];
        if (tileAboveId === undefined) return;

        const npc = npcs.find(n => n.tile_type === tileAboveId);
        
        if (npc) {
            const npcId = `npc-${npc.id}`;
            if (npcId !== activeEventGrid) {
                setActiveEventGrid(npcId);
                console.log('Auto-triggered NPC dialogue from below:', npc.faculty_name);
                
                if (npc.dialog_sequences) {
                    setActiveDialog(npc.dialog_sequences);
                    saveInteraction('npc_dialog', npc.id);
                } else if (npc.content) {
                    // Fallback to simple modal if no complex dialog sequence
                    setModalData({
                        isOpen: true,
                        title: npc.faculty_name || "Notification",
                        description: npc.content,
                        isQuest: npc.quest_id ? true : false,
                        cta: {
                            enabled: npc.cta_enabled,
                            text: npc.cta_text,
                            link: npc.cta_link
                        }
                    });
                }
            }
        } else {
            // Reset activeEventGrid if not on a trigger tile or below an NPC
            const currentTileId = gridData[position.y]?.[position.x];
            const eventGrid = eventGrids.find(g => g.tile_type === currentTileId);
            if (!eventGrid) {
                setActiveEventGrid(null);
            }
        }
    }, [position, gridData, npcs, activeEventGrid]);

    // Tile-based trigger check for Event Grids
    useEffect(() => {
        if (!position || gridData.length === 0) return;
        
        const currentTileId = gridData[position.y]?.[position.x];
        if (currentTileId === undefined) return;

        // Find if this tile is an event grid trigger (ID > 1000)
        const eventGrid = eventGrids.find(g => g.tile_type === currentTileId);
        
        if (eventGrid && eventGrid.id !== activeEventGrid) {
            setActiveEventGrid(eventGrid.id);
            console.log('Stepped on event trigger:', eventGrid.name);
            
            // Check for Load Map trigger
            if (eventGrid.grid_config?.target_map_id && onLoadMap) {
                console.log('Stepped trigger: Loading map', eventGrid.grid_config.target_map_id);
                onLoadMap(eventGrid.grid_config.target_map_id);
                return;
            }

            if (eventGrid.dialog_sequences) {
                setActiveDialog(eventGrid.dialog_sequences);
            } else if (eventGrid.content_pages) {
                setActiveContentPage(eventGrid.content_pages);
            } else {
                setModalData({
                    isOpen: true,
                    title: `Event: ${eventGrid.name}`,
                    description: `Welcome to the ${eventGrid.name} zone! You've unlocked a special reward: ${eventGrid.grid_config.rewards}.`,
                    isQuest: false
                });
            }
        }
    }, [position, gridData, eventGrids, activeEventGrid]);

    const currentFrame = useCharacterAnimation(
        direction,
        isMoving,
        gender === 'female' ? femaleAnimationMap : defaultAnimationMap
    );

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
            const { error } = await supabase
                .from('campus_maps')
                .update({ 
                    name: mapName,
                    grid_data: gridData,
                    npcs_data: npcs,
                    event_grids_data: eventGrids,
                    background_image: backgroundImage
                })
                .eq('map_id', mapId);

            if (error) throw error;
            if (onMapUpdate) onMapUpdate(mapName);
            alert('Map saved successfully!');
        } catch (error: any) {
            console.error(error);
            alert('Error saving map: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePaint = (x: number, y: number) => {
        if (!isAdminMode) return;
        setGridData(prev => {
            const newGrid = [...prev];
            
            // If painting a spawn point (4), remove all other spawn points first
            if (selectedBrush === 4) {
                for (let ry = 0; ry < newGrid.length; ry++) {
                    newGrid[ry] = [...newGrid[ry]];
                    for (let rx = 0; rx < newGrid[ry].length; rx++) {
                        if (newGrid[ry][rx] === 4) {
                            newGrid[ry][rx] = 0; // Replace with grass
                        }
                    }
                }
            } else {
                newGrid[y] = [...newGrid[y]];
            }

            if (newGrid[y][x] !== selectedBrush) {
                newGrid[y][x] = selectedBrush;
                if (selectedBrush === 4) {
                    setInitialSpawnPoint({ x, y });
                }

                // Sync NPC/Event positions if a specialized brush was used
                if (selectedBrush >= 101 && selectedBrush <= 999) {
                    setNpcs(prevNpcs => prevNpcs.map(n => n.tile_type === selectedBrush ? { ...n, x, y } : n));
                } else if (selectedBrush >= 1001) {
                    setEventGrids(prevGrids => prevGrids.map(g => g.tile_type === selectedBrush ? { ...g, x, y } : g));
                }
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

    // Determine camera focus position in pixels
    // In Editor mode, we use the free camera. In Play mode, we lock to player.
    const focusX = isEditor ? editorCamera.x : position.x;
    const focusY = isEditor ? editorCamera.y : position.y;

    // Focus position in pixels (center of tile)
    const focusPxX = focusX * BASE_TILE_SIZE + BASE_TILE_SIZE / 2;
    const focusPxY = focusY * BASE_TILE_SIZE + BASE_TILE_SIZE / 2;

    // Calculate translation to center the focus point
    // Math: Translate = Center - (FocusPos * Scale)
    const translateX = viewportCenterX - (focusPxX * scale);
    const translateY = viewportCenterY - (focusPxY * scale);
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

        // Check if this tileId is associated with an NPC (101-999)
        const npc = npcs.find(n => n.tile_type === tileId);
        if (npc) {
            return {
                ...base,
                position: 'relative' as const,
                backgroundColor: isAdminMode ? `rgba(0, 0, 255, ${gridOpacity / 2})` : 'transparent',
                overflow: 'visible'
            };
        }

        // Check if this tileId is an event grid trigger (1001+)
        const eventGrid = eventGrids.find(g => g.tile_type === tileId);
        if (eventGrid) {
            return {
                ...base,
                backgroundColor: isAdminMode ? `rgba(168, 85, 247, ${gridOpacity})` : 'transparent',
                border: isAdminMode ? '1px dashed rgba(168, 85, 247, 0.5)' : 'none'
            };
        }

        // Fallback colors for default definitions
        let color = 'transparent';
        switch (tileId) {
            case 0: color = 'transparent'; break; // Grass / Empty space
            case 1: color = `rgba(255, 0, 0, ${isAdminMode ? gridOpacity : 0})`; break; // Wall
            case 2: color = `rgba(255, 255, 0, ${isAdminMode ? gridOpacity : 0})`; break; // Path
            case 3: color = `rgba(0, 0, 255, ${isAdminMode ? gridOpacity : 0})`; break; // Legacy Interaction
            case 4: color = `rgba(34, 197, 94, ${isAdminMode ? gridOpacity : 0})`; break; // Spawn Point (Green)
        }

        return { ...base, backgroundColor: color };
    };

    return (
        <div
            className={`w-full h-full relative bg-neutral-950 overflow-hidden select-none ${toolMode === 'pan' && isEditor ? 'cursor-grab active:cursor-grabbing' : ''}`}
            ref={containerRef}
            onPointerDown={(e) => {
                if (isEditor && toolMode === 'pan') {
                    setIsDragging(true);
                    setLastPointerPos({ x: e.clientX, y: e.clientY });
                }
            }}
            onPointerMove={(e) => {
                if (isEditor && isDragging && toolMode === 'pan') {
                    const dx = e.clientX - lastPointerPos.x;
                    const dy = e.clientY - lastPointerPos.y;
                    
                    // Update editor camera based on drag delta (inverse movement)
                    // Adjust by scale because when zoomed out, dragging 1px on screen moves more pixels in game world
                    setEditorCamera(prev => ({
                        x: prev.x - dx / (BASE_TILE_SIZE * scale),
                        y: prev.y - dy / (BASE_TILE_SIZE * scale)
                    }));
                    setLastPointerPos({ x: e.clientX, y: e.clientY });
                }
            }}
            onPointerUp={() => {
                setIsPainting(false);
                setIsDragging(false);
            }}
            onPointerLeave={() => {
                setIsPainting(false);
                setIsDragging(false);
            }}
        >
            {/* Top Right Floating Controls Label & UI */}
            <div className="absolute top-4 right-4 z-[100] flex flex-col items-end gap-3 pointer-events-none">

                {/* Game / Map Title */}
                <div className="group relative pointer-events-auto">
                    {isAdminMode ? (
                        <input
                            type="text"
                            value={mapName}
                            onChange={(e) => setMapName(e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="font-bold text-white text-[10px] tracking-[0.2em] uppercase bg-blue-600/40 px-3 py-1 rounded-full backdrop-blur-md border border-blue-400/30 focus:outline-none focus:bg-blue-600/60 transition-all min-w-[120px] text-center shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                            placeholder="Enter Map Name..."
                        />
                    ) : (
                        <div className="font-bold text-white/50 text-[10px] tracking-[0.2em] uppercase bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                            {mapName}
                        </div>
                    )}
                </div>

                {/* Control Column: Admin & Zoom */}
                <div className="flex flex-col items-end gap-2 pointer-events-none">
                    {isEditor && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); setIsAdminMode(!isAdminMode); }}
                            className={`pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-2xl border ${isAdminMode ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-black/60 border-white/20 hover:bg-black/80 text-white/80'}`}
                            title="Admin Editor Mode"
                        >
                            <div className={`w-2 h-2 rounded-full ${isAdminMode ? 'bg-white animate-pulse' : 'bg-red-500'}`} />
                            Admin
                        </button>
                    )}

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
                {(isEditor && isAdminMode) && (
                    <div className="pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/20 p-5 rounded-2xl flex flex-col gap-5 shadow-[0_30px_60px_rgba(0,0,0,0.6)] min-w-[240px] text-white animate-in slide-in-from-top-4 fade-in duration-200">
                        <h3 className="font-black text-lg text-red-400 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-red-500 rounded-full" />
                            Admin Space
                        </h3>

                        <button
                            onClick={handleSaveMap}
                            disabled={isSaving}
                            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:from-neutral-700 disabled:to-neutral-800 disabled:text-neutral-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 text-xs flex items-center justify-center gap-2 mb-2"
                        >
                            {isSaving ? 'Saving...' : '💾 Save Map To Database'}
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsImagePickerOpen(true)}
                                className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 text-xs flex items-center justify-center gap-2"
                            >
                                🖼️ Change
                            </button>
                            <button
                                onClick={() => setBackgroundImage(null)}
                                className="px-4 bg-red-900/20 hover:bg-red-900/30 border border-red-500/30 text-red-400 font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 text-xs flex items-center justify-center"
                                title="Remove background image"
                            >
                                ✖
                            </button>
                        </div>

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
                            <label className="text-xs font-bold text-neutral-400 tracking-wider">TOOL MODE</label>
                            <div className="flex bg-neutral-900 p-1 rounded-xl border border-white/5">
                                <button 
                                    onClick={() => setToolMode('pan')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${toolMode === 'pan' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0V12m-3 .5V12m3 .5V12m0 0V5a1.5 1.5 0 113 0v7m0 0V6a1.5 1.5 0 113 0v4.5m-9 1.5v-1a5 5 0 0110 0v2a5 5 0 01-10 0z" /></svg>
                                    Pan
                                </button>
                                <button 
                                    onClick={() => setToolMode('paint')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${toolMode === 'paint' ? 'bg-red-500 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Paint
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            <label className="text-xs font-bold text-neutral-400 tracking-wider">BRUSHES</label>
                            
                            <div className="space-y-4">
                                {/* Basic Brushes */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-tighter">Basic Tiles</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setSelectedBrush(0)} className={`p-2 rounded-xl text-[10px] font-bold border transition-colors ${selectedBrush === 0 ? 'bg-white text-black border-white' : 'bg-neutral-900 border-white/10 text-neutral-400 hover:bg-neutral-800'}`}>Eraser (0)</button>
                                        <button onClick={() => setSelectedBrush(1)} className={`p-2 rounded-xl text-[10px] font-bold border transition-colors ${selectedBrush === 1 ? 'bg-red-500 text-white border-red-400' : 'bg-neutral-900 border-white/10 text-neutral-400 hover:bg-red-900/40'}`}>Wall (1)</button>
                                        <button onClick={() => setSelectedBrush(4)} className={`p-2 rounded-xl text-[10px] font-bold border transition-colors ${selectedBrush === 4 ? 'bg-green-600 text-white border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-neutral-900 border-white/10 text-neutral-400 hover:bg-green-900/40'}`}>Spawn (4)</button>
                                    </div>
                                </div>

                                {/* NPC Brushes */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-tighter">NPCs</span>
                                    <div className="grid grid-cols-1 gap-1">
                                        {npcs.map(npc => (
                                            <button 
                                                key={npc.id}
                                                onClick={() => setSelectedBrush(npc.tile_type)}
                                                className={`p-2 rounded-xl text-left text-[10px] font-bold border transition-all flex items-center gap-2 ${selectedBrush === npc.tile_type ? 'bg-blue-600 text-white border-blue-400' : 'bg-neutral-900 border-white/10 text-neutral-400 hover:bg-blue-900/20'}`}
                                            >
                                                <img src={`/characters/npc/${npc.sprite_name || 'NPC1'}.png`} className="w-5 h-5 object-contain" alt="" />
                                                <span className="truncate">{npc.faculty_name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Event Trigger Brushes */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-tighter">Event Triggers</span>
                                    <div className="grid grid-cols-1 gap-1">
                                        {eventGrids.map(grid => (
                                            <button 
                                                key={grid.id}
                                                onClick={() => setSelectedBrush(grid.tile_type)}
                                                className={`p-2 rounded-xl text-left text-[10px] font-bold border transition-all flex items-center gap-2 ${selectedBrush === grid.tile_type ? 'bg-purple-600 text-white border-purple-400' : 'bg-neutral-900 border-white/10 text-neutral-400 hover:bg-purple-900/20'}`}
                                            >
                                                <div className="w-4 h-4 rounded bg-purple-500/50 border border-purple-400" />
                                                <span className="truncate">{grid.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

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
                        backgroundImage: `url('${backgroundImage || '/map/game%20map.png'}')`,
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
                                        if (isAdminMode && toolMode === 'paint') {
                                            e.preventDefault(); // prevent touch scrolling
                                            setIsPainting(true);
                                            handlePaint(x, y);
                                        }
                                    }}
                                    onPointerEnter={() => {
                                        if (isAdminMode && isPainting && toolMode === 'paint') {
                                            handlePaint(x, y);
                                        }
                                    }}
                                >
                                    {/* Render NPC Sprite if this is an NPC tile */}
                                    {(() => {
                                        const npc = npcs.find(n => n.tile_type === tileId);
                                        if (npc) {
                                            const scaleFactor = npc.scale || 1.0;
                                            return (
                                                <div 
                                                    className="absolute inset-0 flex items-end justify-center pointer-events-none"
                                                    style={{ overflow: 'visible' }}
                                                >
                                                    <img 
                                                        src={`/characters/npc/${npc.sprite_name || 'NPC1'}.png`}
                                                        alt={npc.faculty_name}
                                                        className="h-full w-auto object-contain transition-transform"
                                                        style={{ 
                                                            transform: `scale(${scaleFactor})`,
                                                            transformOrigin: 'bottom center',
                                                            maxWidth: 'none', // Allow it to exceed parent width
                                                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                                                        }}
                                                    />
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

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

                {/* Render Event Grids (Ghostly markers for editor) */}
                {isAdminMode && eventGrids.map((grid) => (
                    <div
                        key={grid.id}
                        className="absolute flex items-center justify-center pointer-events-none z-15 opacity-30"
                        style={{
                            width: BASE_TILE_SIZE * 3, // Fixed visualization radius
                            height: BASE_TILE_SIZE * 3,
                            left: (grid.x - 1) * BASE_TILE_SIZE,
                            top: (grid.y - 1) * BASE_TILE_SIZE,
                        }}
                    >
                        <div className="w-full h-full rounded-full bg-purple-500/10 border border-purple-500/20" />
                    </div>
                ))}

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
                        src={`/characters/${gender}/character-${currentFrame}.png`}
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
                cta={modalData.cta}
            />

            {activeContentPage && (
                <ContentPageModal 
                    page={activeContentPage} 
                    onClose={() => setActiveContentPage(null)} 
                />
            )}

            {activeDialog && (
                <DialogViewer 
                    isOpen={true}
                    sequence={activeDialog}
                    onClose={() => setActiveDialog(null)}
                    onEvent={(eventName) => {
                        console.log(`Action triggered from dialog: ${eventName}`);
                        // Handle specific game events here
                        if (eventName.startsWith('OPEN_')) {
                            setModalData({
                                isOpen: true,
                                title: "New Quest Available!",
                                description: `You have unlocked a new challenge. Check your quest log for details.`,
                                isQuest: true,
                                cta: { enabled: true, text: "Accept Quest", link: "/quests" }
                            });
                        }
                    }}
                />
            )}
            {/* Map Image Picker Modal */}
            {isImagePickerOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div 
                        className="bg-neutral-900 border border-white/10 rounded-[40px] w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
                            <div>
                                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                    <span className="w-2 h-8 bg-blue-500 rounded-full" />
                                    Select Map Background
                                </h3>
                                <p className="text-neutral-400 text-sm mt-1">Choose a large view for your campus exploration.</p>
                            </div>
                                                            <button 
                                onClick={() => setIsImagePickerOpen(false)}
                                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all flex items-center justify-center group"
                            >
                                <svg className="w-6 h-6 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <MapImageGrid 
                                onSelect={(url) => {
                                    setBackgroundImage(url);
                                    if (onBackgroundImageChange) onBackgroundImageChange(url);
                                    setIsImagePickerOpen(false);
                                }}
                                selectedUrl={backgroundImage}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MapImageGrid({ onSelect, selectedUrl }: { onSelect: (url: string) => void, selectedUrl: string | null }) {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/map-images')
            .then(res => res.json())
            .then(data => {
                setImages(data.images || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="flex justify-center p-20 text-blue-500 animate-pulse font-black text-xl tracking-widest">LOADING MAPS...</div>;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {images.map((img) => (
                <button
                    key={img.value}
                    onClick={() => onSelect(img.value)}
                    className={`group relative aspect-video rounded-3xl overflow-hidden border-2 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${selectedUrl === img.value ? 'border-blue-500 shadow-[0_20px_40px_rgba(37,99,235,0.3)] ring-4 ring-blue-500/20' : 'border-white/5 grayscale-[0.5] hover:grayscale-0 hover:border-white/20 hover:shadow-2xl'}`}
                >
                    <img src={img.value} className="w-full h-full object-cover" alt={img.label} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-white font-black text-xs uppercase tracking-widest">{img.label}</span>
                    </div>
                    {selectedUrl === img.value && (
                        <div className="absolute top-3 right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in-0 duration-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
}
