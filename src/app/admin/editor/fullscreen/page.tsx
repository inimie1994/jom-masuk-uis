"use client";

import GameWorld from '@/components/GameWorld';
import Link from 'next/link';

export default function FullscreenEditorPage() {
    return (
        <div className="w-screen h-screen bg-black overflow-hidden relative">
            <GameWorld gender="male" isEditor={true} />
            
            {/* Overlay link back to admin */}
            <div className="absolute bottom-6 left-6 z-[1000]">
                <Link 
                    href="/admin/editor"
                    className="px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-xs font-bold text-neutral-400 hover:text-white transition-all flex items-center gap-2 group shadow-2xl"
                >
                    <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Admin Dashboard
                </Link>
            </div>
        </div>
    );
}
