"use client";
import React, { useState, useEffect } from 'react';
import GameWorld from '@/components/GameWorld';
import RegistrationModal, { PlayerData } from '@/components/RegistrationModal';
import IntroPage from '@/components/IntroPage';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [currentMapId, setCurrentMapId] = useState(1);
  const [menuConfig, setMenuConfig] = useState<any>({
    header_label: 'PERSONAL PROFILE',
    exploration_label: 'EXPLORATION PROGRESS',
    quests_label: 'QUESTS COMPLETED',
    log_label: 'ADVENTURE LOG',
    exploration_max: 100,
    quests_total: 3,
    exploration_source: 'manual',
    quests_source: 'manual',
    is_active: true
  });

  const [interactions, setInteractions] = useState<any[]>([]);
  const [gameTotals, setGameTotals] = useState({ npcs: 0, events: 0 });

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

    // Fetch dynamic menu config
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('info_panel_config')
        .select('*')
        .limit(1)
        .single();
      
      if (data) {
        setMenuConfig(data);
      }
    };

    const fetchTotals = async () => {
        const { count: npcCount } = await supabase.from('npc_data').select('*', { count: 'exact', head: true });
        const { count: eventCount } = await supabase.from('event_grids').select('*', { count: 'exact', head: true });
        setGameTotals({ npcs: npcCount || 0, events: eventCount || 0 });
    };

    fetchConfig();
    fetchTotals();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuConfig.is_active) {
        setIsMenuOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuConfig.is_active]);

  // Fetch interactions when menu opens or player data changes
  useEffect(() => {
    if (isMenuOpen && playerData?.icNo) {
        const fetchInteractions = async () => {
            const { data } = await supabase
                .from('player_progress')
                .select('*')
                .eq('player_ic_no', playerData.icNo);
            if (data) setInteractions(data);
        };
        fetchInteractions();
    }
  }, [isMenuOpen, playerData?.icNo]);

  const getProgress = (type: 'exploration' | 'quests') => {
    const source = type === 'exploration' ? menuConfig.exploration_source : menuConfig.quests_source;
    const manualMax = type === 'exploration' ? menuConfig.exploration_max : menuConfig.quests_total;

    if (source === 'manual') {
        const current = type === 'exploration' ? 45 : 1; // Placeholder for manual logic
        return { current, total: manualMax };
    }

    if (source === 'npc') {
        const uniqueNpcs = new Set(interactions.filter(i => i.interaction_type === 'npc_dialog').map(i => i.id_reference)).size;
        return { current: uniqueNpcs, total: gameTotals.npcs };
    }

    if (source === 'event') {
        const uniqueEvents = new Set(interactions.filter(i => i.interaction_type === 'event_trigger').map(i => i.id_reference)).size;
        return { current: uniqueEvents, total: gameTotals.events };
    }

    return { current: 0, total: 100 };
  };

  const exploration = getProgress('exploration');
  const quests = getProgress('quests');

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
            playerIcNo={playerData.icNo}
            onLoadMap={(id) => {
              console.log('Transitioning to map:', id);
              setCurrentMapId(id);
            }}
          />
        )}
      </div>

      {/* PAUSE MENU TOGGLE BUTTON (Mobile/Casual) */}
      {!showIntro && playerData && !isMenuOpen && menuConfig.is_active && (
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="absolute top-6 left-6 z-10 w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all active:scale-95 shadow-xl group"
        >
          <svg className="w-6 h-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      )}

      {/* CENTERED PAUSE MENU */}
      {isMenuOpen && menuConfig.is_active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          {/* Backdrop Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className="relative z-110 w-full max-w-md flex flex-col gap-4 animate-in zoom-in-95 duration-300">
            {/* User Profile Card */}
            <div className="px-6 py-8 rounded-[40px] bg-neutral-900/90 backdrop-blur-xl border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6">
                <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/20 text-blue-400">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
              </div>

              <div className="flex flex-col">
                <h2 className="text-[11px] font-black text-blue-400 tracking-[0.3em] uppercase mb-1">{menuConfig.header_label}: {playerData?.icNo || 'UNKNOWN'}</h2>
                <h3 className="text-3xl font-black text-white mb-8 drop-shadow-lg">{playerData?.fullName || 'Future Leader'}</h3>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black text-neutral-400 tracking-widest uppercase">
                      <span>{menuConfig.exploration_label}</span>
                      <span className="text-blue-400">{exploration.total > 0 ? Math.round((exploration.current / exploration.total) * 100) : 0}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div 
                         className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.6)] rounded-full transition-all duration-1000 ease-out" 
                         style={{ width: `${exploration.total > 0 ? (exploration.current / exploration.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black text-neutral-400 tracking-widest uppercase">
                      <span>{menuConfig.quests_label}</span>
                      <span className="text-emerald-400">{quests.current} / {quests.total}</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.6)] rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${quests.total > 0 ? (quests.current / quests.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Log */}
            <div className="p-6 rounded-[35px] bg-black/60 backdrop-blur-xl border border-white/5 flex flex-col shadow-2xl">
              <h3 className="text-xs font-black text-white mb-4 flex items-center gap-3 tracking-widest uppercase opacity-60">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)]" />
                {menuConfig.log_label}
              </h3>
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                {interactions.length > 0 ? (
                    interactions
                        .sort((a, b) => new Date(b.last_interacted_at).getTime() - new Date(a.last_interacted_at).getTime())
                        .slice(0, 5)
                        .map((interaction, i) => (
                            <div key={i} className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5 text-sm transition-hover hover:bg-white/[0.05] flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                                        {interaction.interaction_type === 'npc_dialog' ? 'Interaction' : 'Discovery'}
                                    </span>
                                    <span className="text-neutral-300 font-bold">
                                        {interaction.interaction_type === 'npc_dialog' 
                                            ? `Met Faculty Member #${interaction.id_reference}` 
                                            : `Found special zone #${interaction.id_reference}`}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-neutral-500 uppercase">
                                    {new Date(interaction.last_interacted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                ) : (
                    <div className="px-4 py-8 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
                        <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase">No activities recorded yet</p>
                    </div>
                )}
              </div>
            </div>

            {/* Resume Button */}
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="w-full py-5 rounded-[25px] bg-white text-black font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mb-2"
            >
              Resume Journey
            </button>

            {/* Help / Controls Hint */}
            <div className="flex justify-center gap-3">
              {['WASD', 'Space'].map(key => (
                <kbd key={key} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
