"use client";
import React, { useState, useEffect } from 'react';
import GameWorld from '@/components/GameWorld';
import RegistrationModal, { PlayerData } from '@/components/RegistrationModal';
import IntroPage from '@/components/IntroPage';

export default function Home() {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [currentMapId, setCurrentMapId] = useState(1);

  useEffect(() => {
    // Check for saved player data
    const savedPlayer = localStorage.getItem('campusQuestPlayer');
    if (savedPlayer) {
      try {
        setPlayerData(JSON.parse(savedPlayer));
      } catch (e) {
        console.error("Error parsing saved player data", e);
      }
    }

    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsDetailsExpanded(false);
      } else {
        setIsDetailsExpanded(true);
      }
    };
    checkMobile(); // Check on initial load
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen w-screen bg-[#050505] text-white selection:bg-blue-500/30 font-sans overflow-hidden fixed inset-0">
      {showIntro && <IntroPage onStart={() => setShowIntro(false)} hasSavedData={!!playerData} />}
      {!showIntro && !playerData && <RegistrationModal onSubmit={setPlayerData} onClose={() => setShowIntro(true)} />}

      {/* FULLSCREEN GAME MAP */}
      <div className="absolute inset-0 z-0">
        {playerData && (
          <GameWorld 
            key={currentMapId}
            mapId={currentMapId}
            gender={playerData.gender} 
            onLoadMap={(id) => {
              console.log('Transitioning to map:', id);
              setCurrentMapId(id);
            }}
          />
        )}
      </div>

      {/* TOP LEFT FLOATING UI: Player Details & Status */}
      <div className="pointer-events-none absolute top-4 left-4 z-10 flex flex-col gap-2 w-[240px] md:w-[320px]">

        {/* User Profile Card */}
        <div className={`pointer-events-auto px-4 py-3 md:p-5 rounded-3xl bg-black/60 backdrop-blur-md border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-300 ${isDetailsExpanded ? 'max-h-[500px]' : 'max-h-[44px] md:max-h-[500px]'}`}>

          <div className="flex justify-between items-center relative z-20">
            <h2 className="text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase line-clamp-1 mt-0.5">IC_NO: {playerData?.icNo || 'UNKNOWN'}</h2>
            <button
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className="md:hidden w-6 h-6 flex flex-shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white pointer-events-auto transition-colors z-30 ml-2"
              aria-label="Toggle Details"
            >
              <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isDetailsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>

          <div className={`transition-all duration-300 ${isDetailsExpanded ? 'opacity-100 mt-3 md:mt-1' : 'opacity-0 mt-0 h-0 overflow-hidden pointer-events-none md:opacity-100 md:mt-1 md:h-auto md:overflow-visible md:pointer-events-auto'}`}>
            <div className="absolute top-0 right-0 p-3 hidden md:block">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/20 text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-4 drop-shadow-md">{playerData?.fullName || 'Future Leader'}</h3>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-neutral-400 tracking-wider">
                  <span>EXPLORATION</span>
                  <span>45%</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full w-[45%] bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-neutral-400 tracking-wider">
                  <span>QUESTS DONE</span>
                  <span>1 / 3</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full w-[33%] bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log & Controls wrapper */}
        <div className={`transition-all duration-300 origin-top flex flex-col gap-2 ${isDetailsExpanded ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 h-0 overflow-hidden pointer-events-none md:opacity-100 md:scale-y-100 md:h-auto md:overflow-visible md:pointer-events-auto'}`}>
          {/* Activity Log (Mini version) */}
          <div className="pointer-events-auto p-4 rounded-3xl bg-black/50 backdrop-blur-md border border-white/5 flex flex-col shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2 drop-shadow-md">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              Activity Log
            </h3>
            <div className="space-y-2 overflow-hidden relative">
              {/* Fade out mask for logs */}
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

              {[
                { t: '10:45 AM', m: 'Talked to the Dean.' },
                { t: '10:32 AM', m: 'Visited Faculty of IT.' },
                { t: '10:15 AM', m: 'Entered Campus Grounds.' }
              ].map((log, i) => (
                <div key={i} className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <span className="font-bold text-blue-400 opacity-80 mr-2">{log.t}</span>
                  <span className="text-neutral-300">{log.m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Help / Controls Hint */}
          <div className="pointer-events-auto flex flex-wrap gap-2 mt-1">
            {['WASD to Move', 'Space to Interact'].map(key => (
              <kbd key={key} className="px-2.5 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[9px] font-bold text-neutral-400 uppercase tracking-wider shadow-lg">
                {key}
              </kbd>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
