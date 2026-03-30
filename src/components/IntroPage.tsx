"use client";

import React, { useState, useEffect } from 'react';

interface IntroPageProps {
  onStart: () => void;
  hasSavedData?: boolean;
}

export default function IntroPage({ onStart, hasSavedData }: IntroPageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden bg-black">
      {/* BACKGROUND LAYER: Blurred Game Map with Zoom Animation */}
      <div 
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10000ms] ease-out ${isLoaded ? 'scale-110' : 'scale-100'}`}
        style={{ 
          backgroundImage: 'url("/map/game map.png")',
          filter: 'blur(8px) brightness(0.4)'
        }}
      />
      
      {/* VIGNETTE & OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

      {/* CONTENT LAYER */}
      <div className={`relative z-10 flex flex-col items-center text-center px-6 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* LOGO / TITLE AREA */}
        <div className="relative mb-2">
           <div className="absolute inset-0 blur-2xl bg-blue-500/30 animate-pulse" />
           <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-100 to-blue-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
             CAMPUS<br />QUEST
           </h1>
        </div>
        
        <p className="text-blue-200/60 text-sm md:text-base font-medium tracking-[0.3em] uppercase mb-12 max-w-md">
          Begin your digital academic odyssey
        </p>

        {/* CHARACTER DECORATIONS */}
        <div className="flex gap-16 mb-12 items-end">
            {/* Male Sprite Preview */}
            <div className="group relative">
                <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <img 
                    src="/characters/male/character-0.png" 
                    alt="Male Character" 
                    className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] animate-bounce"
                    style={{ animationDuration: '3s' }}
                />
            </div>

            {/* Female Sprite Preview */}
            <div className="group relative">
                <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <img 
                    src="/characters/female/character-0.png" 
                    alt="Female Character" 
                    className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] animate-bounce"
                    style={{ animationDuration: '3.5s' }}
                />
            </div>
        </div>

        {/* START BUTTON */}
        <button 
          onClick={onStart}
          className="group relative px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          {/* Button Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <span className="relative z-10 text-lg font-bold tracking-widest text-white group-hover:text-blue-100 transition-colors">
            {hasSavedData ? 'CONTINUE ADVENTURE' : 'START YOUR ADVENTURE'}
          </span>

          {/* Animating Border Accent */}
          <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-blue-400 group-hover:w-full transition-all duration-500" />
        </button>

        {/* FOOTER TEXT */}
        <div className="mt-16 text-[10px] font-bold text-white/20 tracking-[0.2em] uppercase">
          Powered by Advanced Campus Engine &bull; V1.0.4
        </div>
      </div>

      {/* FLOATING PIXELS DECORATION */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              width: Math.random() * 3 + 'px',
              height: Math.random() * 3 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 5 + 's',
              opacity: Math.random()
            }}
          />
        ))}
      </div>
    </div>
  );
}
