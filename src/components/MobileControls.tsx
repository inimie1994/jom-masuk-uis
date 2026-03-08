"use client";

import React from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface MobileControlsProps {
    onMove: (dir: Direction) => void;
}

export default function MobileControls({ onMove }: MobileControlsProps) {
    return (
        <div className="flex flex-col items-center gap-2 p-4 md:hidden">
            <button
                onClick={() => onMove('UP')}
                className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center border border-white/10 active:bg-blue-600 transition-colors shadow-lg active:scale-95"
            >
                <svg className="w-8 h-8 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
            </button>
            <div className="flex gap-2">
                <button
                    onClick={() => onMove('LEFT')}
                    className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center border border-white/10 active:bg-blue-600 transition-colors shadow-lg active:scale-95"
                >
                    <svg className="w-8 h-8 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    onClick={() => onMove('DOWN')}
                    className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center border border-white/10 active:bg-blue-600 transition-colors shadow-lg active:scale-95"
                >
                    <svg className="w-8 h-8 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                <button
                    onClick={() => onMove('RIGHT')}
                    className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center border border-white/10 active:bg-blue-600 transition-colors shadow-lg active:scale-95"
                >
                    <svg className="w-8 h-8 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
