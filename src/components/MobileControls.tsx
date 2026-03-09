"use client";

import React from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface MobileControlsProps {
    onMove: (dir: Direction) => void;
    onInteract?: () => void;
}

export default function MobileControls({ onMove, onInteract }: MobileControlsProps) {
    return (
        <div className="absolute inset-0 pointer-events-none z-50 md:hidden">
            {/* Interact Button (Bottom Left) */}
            <div className="absolute bottom-6 left-6 pointer-events-auto">
                <button
                    onClick={onInteract}
                    className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-white/90 active:bg-blue-600/50 transition-colors shadow-lg active:scale-95 flex-shrink-0"
                >
                    <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <span className="text-[10px] font-bold tracking-widest uppercase">Interact</span>
                </button>
            </div>

            {/* Virtual Joypad (Bottom Right) */}
            <div className="absolute bottom-6 right-6 pointer-events-auto">
                {/* 3x3 Grid for Cross Shape */}
                <div className="grid grid-cols-3 grid-rows-3 w-[150px] h-[150px] gap-0 opacity-80 backdrop-blur-sm drop-shadow-2xl">
                    <div />
                    <button
                        onPointerDown={(e) => { e.preventDefault(); onMove('UP'); }}
                        className="bg-[#2A2A2A] border-t-[3px] border-x-[3px] border-[#444] rounded-t-xl flex items-center justify-center active:bg-neutral-600 transition-colors shadow-[inset_0_4px_4px_rgba(255,255,255,0.1)]"
                    >
                        <svg className="w-5 h-5 text-neutral-300" viewBox="0 0 24 24"><polygon points="12,6 4,16 20,16" fill="currentColor" /></svg>
                    </button>
                    <div />

                    <button
                        onPointerDown={(e) => { e.preventDefault(); onMove('LEFT'); }}
                        className="bg-[#2A2A2A] border-l-[3px] border-y-[3px] border-[#444] rounded-l-xl flex items-center justify-center active:bg-neutral-600 transition-colors shadow-[inset_4px_0_4px_rgba(255,255,255,0.1)]"
                    >
                        <svg className="w-5 h-5 text-neutral-300" viewBox="0 0 24 24"><polygon points="6,12 16,4 16,20" fill="currentColor" /></svg>
                    </button>

                    <div className="bg-[#2A2A2A] flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-neutral-600 shadow-inner" />
                    </div>

                    <button
                        onPointerDown={(e) => { e.preventDefault(); onMove('RIGHT'); }}
                        className="bg-[#2A2A2A] border-r-[3px] border-y-[3px] border-[#444] rounded-r-xl flex items-center justify-center active:bg-neutral-600 transition-colors shadow-[inset_-4px_0_4px_rgba(255,255,255,0.1)]"
                    >
                        <svg className="w-5 h-5 text-neutral-300" viewBox="0 0 24 24"><polygon points="18,12 8,20 8,4" fill="currentColor" /></svg>
                    </button>

                    <div />
                    <button
                        onPointerDown={(e) => { e.preventDefault(); onMove('DOWN'); }}
                        className="bg-[#2A2A2A] border-b-[3px] border-x-[3px] border-[#444] rounded-b-xl flex items-center justify-center active:bg-neutral-600 transition-colors shadow-[inset_0_-4px_4px_rgba(255,255,255,0.1)]"
                    >
                        <svg className="w-5 h-5 text-neutral-300" viewBox="0 0 24 24"><polygon points="12,18 20,8 4,8" fill="currentColor" /></svg>
                    </button>
                    <div />
                </div>
            </div>
        </div>
    );
}
