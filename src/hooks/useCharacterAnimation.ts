import { useState, useEffect } from 'react';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface AnimationFrames {
    idle: number[];
    walk: number[];
}

export type CharacterAnimationMap = Record<Direction, AnimationFrames>;

// Default mapped frames for a typical sprite sheet. 
// You can adjust these numbers to perfectly match your 13-frame character sprite!
export const defaultAnimationMap: CharacterAnimationMap = {
    DOWN: { idle: [4], walk: [0, 1] },
    LEFT: { idle: [12], walk: [10, 11] },
    RIGHT: { idle: [7], walk: [2, 3] },
    UP: { idle: [5], walk: [5, 6] }
};

// Specialized map for the 10-frame female character
export const femaleAnimationMap: CharacterAnimationMap = {
    DOWN: { idle: [2], walk: [0, 1] },
    LEFT: { idle: [7], walk: [8, 9] },
    RIGHT: { idle: [6], walk: [11, 10] },
    UP: { idle: [5], walk: [4, 5] }
};

export function useCharacterAnimation(
    direction: Direction,
    isMoving: boolean,
    animMap: CharacterAnimationMap = defaultAnimationMap,
    intervalMs: number = 150
) {
    const [frameIndex, setFrameIndex] = useState(0);

    // Get the array of frames to loop through based on current state
    const currentSequence = isMoving ? animMap[direction].walk : animMap[direction].idle;

    // Reset loop when changing state or direction
    useEffect(() => {
        setFrameIndex(0);
    }, [isMoving, direction]);

    useEffect(() => {
        // No need to setInterval if there's only 1 frame
        if (currentSequence.length <= 1) return;

        const timer = setInterval(() => {
            setFrameIndex((prev) => (prev + 1) % currentSequence.length);
        }, intervalMs);

        return () => clearInterval(timer);
    }, [currentSequence, intervalMs]);

    // Fallback to 0 if something is undefined
    return currentSequence[frameIndex] ?? 0;
}
