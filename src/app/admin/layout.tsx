'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setLoading(false);
      
      if (!session && pathname !== '/admin/login') {
        router.push('/admin/login');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (!session && pathname !== '/admin/login') {
        router.push('/admin/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  // While checking session, show a simple loader or nothing to prevent flash
  if (loading && pathname !== '/admin/login') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Login or Fullscreen Editor pages get their own empty layout
  if (pathname === '/admin/login' || pathname === '/admin/editor/fullscreen') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#050505] text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/50 backdrop-blur-xl p-6 flex flex-col gap-8 fixed h-full">
        <div className="px-2">
          <h1 className="text-xl font-black tracking-tighter text-blue-500">CQ ADMIN</h1>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Management Portal</p>
        </div>

        <nav className="flex flex-col gap-2">
          <Link href="/admin" className={`px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm font-medium ${pathname === '/admin' ? 'bg-white/10 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/5'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Dashboard
          </Link>
          <Link href="/admin/visitors" className={`px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm font-medium ${pathname === '/admin/visitors' ? 'bg-white/10 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/5'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Visitor Info
          </Link>
          <Link href="/admin/npcs" className={`px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm font-medium ${pathname === '/admin/npcs' ? 'bg-white/10 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/5'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            NPC Manager
          </Link>
          <Link href="/admin/event-grids" className={`px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm font-medium ${pathname === '/admin/event-grids' ? 'bg-white/10 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/5'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Event Grids
          </Link>
          <Link href="/admin/editor" className={`px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm font-medium ${pathname === '/admin/editor' ? 'bg-white/10 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/5'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Map Editor
          </Link>
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button 
            onClick={handleLogout}
            className="px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors flex items-center gap-3 text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Logout
          </button>
          
          <div className="pt-4 border-t border-white/5">
            <Link href="/" className="text-xs text-neutral-500 hover:text-blue-400 transition-colors flex items-center gap-2">
              ← Back to Campus
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
