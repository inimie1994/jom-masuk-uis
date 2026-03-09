import { useState, useEffect, useCallback } from 'react';

type Position = { x: number; y: number };
type TileDefinition = {
    tile_id: number;
    label: string;
    is_collidable: boolean;
    is_trigger: boolean;
    metadata: any;
};

export const usePlayerMovement = (
    initialPosition: Position,
    grid: number[][],
    tiles: Record<number, TileDefinition>,
    onInteraction?: (x: number, y: number, tileData: TileDefinition) => void
) => {
    const [position, setPosition] = useState<Position>(initialPosition);
    const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('DOWN');
    const [isMoving, setIsMoving] = useState(false);

    const moveIfValid = useCallback((dx: number, dy: number) => {
        // Prevent movement if grid or tiles aren't loaded yet
        if (!grid || grid.length === 0 || !tiles) return;

        setPosition((prev) => {
            const nextX = prev.x + dx;
            const nextY = prev.y + dy;

            // Determine direction
            if (dx > 0) setDirection('RIGHT');
            else if (dx < 0) setDirection('LEFT');
            else if (dy > 0) setDirection('DOWN');
            else if (dy < 0) setDirection('UP');

            // Flag as moving temporarily for animation
            setIsMoving(true);

            // Check boundaries
            if (nextY >= 0 && nextY < grid.length && nextX >= 0 && nextX < grid[0].length) {
                const tileId = grid[nextY][nextX];
                const tileDef = tiles[tileId];

                // Check collision dynamically from DB definitions
                if (tileDef && !tileDef.is_collidable) {
                    // Check interaction trigger from DB definitions
                    if (tileDef.is_trigger && onInteraction) {
                        onInteraction(nextX, nextY, tileDef);
                    }
                    return { x: nextX, y: nextY };
                }
            }
            return prev;
        });

        // Reset isMoving after a short delay (simulating tile-based movement finish)
        setTimeout(() => setIsMoving(false), 200);
    }, [grid, tiles, onInteraction]);

    const interact = useCallback(() => {
        if (!grid || grid.length === 0 || !tiles) return;

        let dx = 0;
        let dy = 0;
        if (direction === 'UP') dy = -1;
        else if (direction === 'DOWN') dy = 1;
        else if (direction === 'LEFT') dx = -1;
        else if (direction === 'RIGHT') dx = 1;

        const targetX = position.x + dx;
        const targetY = position.y + dy;

        if (targetY >= 0 && targetY < grid.length && targetX >= 0 && targetX < grid[0].length) {
            const tileId = grid[targetY][targetX];
            const tileDef = tiles[tileId];

            // Allow interaction with triggers or specific interactable tiles in front of the player
            if (tileDef && tileDef.is_trigger && onInteraction) {
                onInteraction(targetX, targetY, tileDef);
            }
        }
    }, [position, direction, grid, tiles, onInteraction]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    moveIfValid(0, -1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    moveIfValid(0, 1);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    moveIfValid(-1, 0);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    moveIfValid(1, 0);
                    break;
                case ' ': // Spacebar
                    interact();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveIfValid]);

    return { position, direction, isMoving, moveIfValid, interact };
};
