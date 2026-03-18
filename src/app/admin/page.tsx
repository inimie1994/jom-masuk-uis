import React from 'react';
import { supabase } from '@/lib/supabase';

async function getStats() {
  const { count: playerCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });
    
  const { count: leadCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  const { count: npcCount } = await supabase
    .from('npc_data')
    .select('*', { count: 'exact', head: true });

  return { playerCount: playerCount || 0, leadCount: leadCount || 0, npcCount: npcCount || 0 };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-neutral-400 mt-1">Real-time statistics for CampusQuest.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-blue-600/10 border border-blue-500/20 backdrop-blur-sm">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Total Visitors</p>
          <h3 className="text-4xl font-black">{stats.playerCount}</h3>
          <p className="text-[10px] text-blue-500/60 mt-4 font-medium uppercase tracking-tighter">Registered via Portal</p>
        </div>

        <div className="p-6 rounded-3xl bg-emerald-600/10 border border-emerald-500/20 backdrop-blur-sm">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Total Leads</p>
          <h3 className="text-4xl font-black">{stats.leadCount}</h3>
          <p className="text-[10px] text-emerald-500/60 mt-4 font-medium uppercase tracking-tighter">Completed Quests</p>
        </div>

        <div className="p-6 rounded-3xl bg-orange-600/10 border border-orange-500/20 backdrop-blur-sm">
          <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Active NPCs</p>
          <h3 className="text-4xl font-black">{stats.npcCount}</h3>
          <p className="text-[10px] text-orange-500/60 mt-4 font-medium uppercase tracking-tighter">Interactable Entities</p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
        <h4 className="font-bold text-sm uppercase tracking-widest text-neutral-500 mb-4">Quick Actions</h4>
        <div className="flex flex-wrap gap-4">
           {/* Placeholder for quick actions */}
           <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-sm font-semibold pointer-events-none opacity-50">
             Export Data (Coming Soon)
           </div>
           <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-sm font-semibold pointer-events-none opacity-50">
             Broadcast Update (Coming Soon)
           </div>
        </div>
      </div>
    </div>
  );
}
