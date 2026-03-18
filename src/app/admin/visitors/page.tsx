import React from 'react';
import { supabase } from '@/lib/supabase';

interface Player {
  id: string;
  full_name: string;
  ic_no: string;
  gender: string;
  spm_result: string | null;
  created_at: string;
}

async function getVisitors(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching players:', error);
    return [];
  }
  return (data as Player[]) || [];
}

export default async function VisitorsPage() {
  const visitors = await getVisitors();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Visitor Info</h2>
          <p className="text-neutral-400 mt-1">Detailed list of all players registered in CampusQuest.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total Count</p>
          <p className="text-2xl font-black text-blue-500">{visitors.length}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Registration Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Full Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">IC Number</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Gender</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">SPM Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visitors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 italic text-sm">
                    No visitors recorded yet.
                  </td>
                </tr>
              ) : (
                visitors.map((visitor: Player) => (
                  <tr key={visitor.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 text-xs text-neutral-400 font-mono">
                      {new Date(visitor.created_at).toLocaleDateString()} {new Date(visitor.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg ${visitor.gender === 'male' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'bg-purple-600/20 text-purple-400 border border-purple-500/20'}`}>
                          {visitor.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm group-hover:text-blue-400 transition-colors">{visitor.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-neutral-300">
                      {visitor.ic_no}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${visitor.gender === 'male' ? 'bg-blue-600/10 text-blue-500' : 'bg-purple-600/10 text-purple-500'}`}>
                        {visitor.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-400">
                      {visitor.spm_result || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
