'use client';

import { useState, useEffect } from 'react';

/**
 * PWA Install Prompt Component
 * 
 * Listens for the 'beforeinstallprompt' event and shows a custom install button.
 * Uses modern design with glassmorphism and smooth transitions.
 */
export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Show the install button after a short delay for better UX
            setTimeout(() => {
                setIsVisible(true);
            }, 3000);
        };

        const handleAppInstalled = () => {
            // Log install to analytics or hide UI
            console.log('PWA was installed');
            setIsVisible(false);
            setDeferredPrompt(null);
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Hide our custom UI
        setIsVisible(false);
        // Show the native install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };

    if (isInstalled || !isVisible) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center shadow-lg overflow-hidden border border-white/20">
                    <img
                        src="/icon-192x192.png"
                        alt="App Icon"
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate">Experience UIS in Fullscreen</h3>
                    <p className="text-white/60 text-xs truncate">Install the app for the best experience</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDismiss}
                        className="p-2 text-white/40 hover:text-white transition-colors"
                        aria-label="Dismiss"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                    <button
                        onClick={handleInstallClick}
                        className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/90 active:scale-95 transition-all shadow-md whitespace-nowrap"
                    >
                        Install
                    </button>
                </div>
            </div>
        </div>
    );
}
