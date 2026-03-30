"use client";

import GameWorld from '@/components/GameWorld';
import Link from 'next/link';

export default function MapEditorPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Map Editor</h2>
                    <p className="text-neutral-400 mt-1">Design and modify the campus layout in real-time.</p>
                </div>
                <Link 
                    href="/admin/editor/fullscreen"
                    className="group relative px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] active:scale-95 flex items-center gap-3 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span>Launch Fullscreen Editor</span>
                </Link>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl relative overflow-hidden h-[600px] w-full">
                <GameWorld gender="male" isEditor={true} />
            </div>
            
            <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                    <h4 className="font-bold text-blue-400">Editor Instructions</h4>
                    <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
                        Use the <strong>Admin Space</strong> panel on the top right of the map to select brushes and save changes. 
                        <strong> Wall (1)</strong> tiles block player movement, while <strong>Trigger (3)</strong> tiles are used for interactions.
                    </p>
                </div>
            </div>
        </div>
    );
}
