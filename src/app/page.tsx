import GameWorld from '@/components/GameWorld';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 font-sans">

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 pt-12 pb-8 text-center px-4">
        <div className="inline-block px-4 py-1.5 mb-4 rounded-full bg-white/5 border border-white/10 glass">
          <span className="text-xs font-bold tracking-widest text-blue-400 uppercase pixel-font">Phase 1: Open Alpha</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-500">
          UniQuest PWA
        </h1>
        <p className="max-w-xl mx-auto text-neutral-400 text-lg md:text-xl font-medium leading-relaxed">
          Embark on a digital tour of our campus. Interaction with departments, complete quests, and secure your future.
        </p>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-start justify-center">

        {/* Game Viewport Area */}
        <section className="flex-1 w-full flex flex-col items-center overflow-hidden">
          <div className="mb-6 w-full flex items-center justify-between px-2">
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg glass flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-neutral-300 pixel-font tracking-wider">LIVE SERVER</span>
              </div>
            </div>
            <div className="hidden sm:flex gap-4 text-neutral-500 text-xs font-bold pixel-font tracking-widest">
              <span>FPS: 60</span>
              <span>LAT: 12ms</span>
            </div>
          </div>

          <div className="w-full flex items-center justify-center p-4 md:p-12 bg-neutral-900/40 rounded-[2.5rem] md:rounded-[3rem] border border-white/5 shadow-2xi relative group overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem] pointer-events-none" />
            <GameWorld />
          </div>

          <div className="mt-8 hidden md:flex gap-3 flex-wrap justify-center">
            {['WASD to Move', 'Arrows supported', 'Space to Interact', 'ESC to Close'].map(key => (
              <kbd key={key} className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-[10px] font-bold text-neutral-400 shadow-md">
                {key}
              </kbd>
            ))}
          </div>
        </section>

        {/* Conventional Sidebar - Student Profile & Stats */}
        <aside className="w-full lg:w-[400px] shrink-0 sticky top-8 flex flex-col gap-6">

          {/* User Profile Card */}
          <div className="p-8 rounded-[2rem] bg-gradient-to-br from-neutral-900 to-black border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/20 text-blue-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
            </div>

            <h2 className="text-sm font-bold text-blue-400 pixel-font mb-2">STUDENT_ID: 39420</h2>
            <h3 className="text-3xl font-bold text-white mb-6">Future Leader</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-neutral-400">
                  <span className="pixel-font">EXPLORATION</span>
                  <span>45%</span>
                </div>
                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full w-[45%] bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-neutral-400">
                  <span className="pixel-font">QUESTS DONE</span>
                  <span>1 / 3</span>
                </div>
                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full w-[33%] bg-gradient-to-r from-emerald-600 to-teal-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="flex-1 p-8 rounded-[2rem] bg-neutral-950 border border-white/5 flex flex-col glass">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
              Recent Activity
            </h3>
            <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {[
                { t: '10:45 AM', m: 'Talked to the Dean.' },
                { t: '10:32 AM', m: 'Visited Faculty of IT.' },
                { t: '10:15 AM', m: 'Entered Campus Grounds.' }
              ].map((log, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors group cursor-default">
                  <p className="text-[10px] font-bold text-blue-500 mb-1 pixel-font opacity-60 group-hover:opacity-100 transition-opacity">{log.t}</p>
                  <p className="text-sm text-neutral-300 font-medium">{log.m}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <button className="w-full group relative py-5 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-bold text-xl transition-all shadow-[0_20px_40px_rgba(37,99,235,0.3)] hover:shadow-[0_25px_50px_rgba(37,99,235,0.4)] overflow-hidden">
                <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10">APPLY NOW</span>
              </button>
            </div>
          </div>
        </aside>

      </main>

      <footer className="relative z-10 py-12 text-center text-neutral-500 text-sm border-t border-white/5 mt-20">
        <p>&copy; 2026 UniQuest PWA. Built for the next generation of scholars.</p>
      </footer>
    </div>
  );
}
