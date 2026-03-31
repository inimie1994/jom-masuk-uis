"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Player {
  id: string;
  full_name: string;
  ic_no: string;
  gender: string;
  phone_number: string | null;
  spm_result: string | null;
  created_at: string;
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState<Player | null>(null);

  useEffect(() => {
    fetchVisitors();
  }, []);

  async function fetchVisitors() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching players:', error);
    } else {
      setVisitors(data || []);
    }
    setIsLoading(false);
  }

  const parseSPM = (jsonStr: string | null) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
  };

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

      <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden backdrop-blur-sm shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Registration Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Full Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">IC Number</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-center">SPM Results</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Gender</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Telefon No.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic text-sm">Loading visitors...</td></tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic text-sm">
                    No visitors recorded yet.
                  </td>
                </tr>
              ) : (
                visitors.map((visitor: Player) => {
                  const results = parseSPM(visitor.spm_result);
                  return (
                    <tr key={visitor.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-xs text-neutral-400 font-mono">
                        {new Date(visitor.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg ${visitor.gender === 'male' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'bg-purple-600/20 text-purple-400 border border-purple-500/20'}`}>
                            {visitor.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-sm group-hover:text-blue-400 transition-colors cursor-pointer" onClick={() => results && setSelectedVisitor(visitor)}>{visitor.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-neutral-300">
                        {visitor.ic_no}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {results ? (
                          <button 
                            onClick={() => setSelectedVisitor(visitor)}
                            className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all"
                          >
                            View Results
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 italic">Not Submitted</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${visitor.gender === 'male' ? 'bg-blue-600/10 text-blue-500' : 'bg-purple-600/10 text-purple-500'}`}>
                          {visitor.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-300 font-medium">
                        {visitor.phone_number || 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SPM Result Modal */}
      {selectedVisitor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedVisitor(null)} />
           <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white">{selectedVisitor.full_name}</h3>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">IC No: {selectedVisitor.ic_no}</p>
                  </div>
                  <button onClick={() => setSelectedVisitor(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {parseSPM(selectedVisitor.spm_result)?.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-sm font-medium text-neutral-300">{item.subject}</span>
                      <span className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-xs font-black text-blue-400 border border-blue-500/20">
                        {item.grade}
                      </span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setSelectedVisitor(null)}
                  className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all border border-white/5"
                >
                  Close
                </button>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
