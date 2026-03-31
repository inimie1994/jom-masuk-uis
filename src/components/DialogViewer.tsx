"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DialogNode {
    type: 'message' | 'event';
    character_name?: string;
    character_image?: string;
    text?: string;
    trigger_event?: string;
    position?: 'left' | 'right';
}

interface DialogViewerProps {
    isOpen: boolean;
    onClose: () => void;
    onEvent?: (eventName: string) => void;
    sequence: {
        title: string;
        sequence_data: DialogNode[];
    };
}

export default function DialogViewer({ isOpen, onClose, onEvent, sequence }: DialogViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    const currentNode = sequence.sequence_data[currentIndex];

    useEffect(() => {
        if (isOpen && currentNode) {
            if (currentNode.type === 'event') {
                // If it's an event node, trigger it and move to next
                if (onEvent && currentNode.trigger_event) {
                    onEvent(currentNode.trigger_event);
                }
                setTimeout(() => {
                    handleNext();
                }, 100);
                return;
            }

            setDisplayedText("");
            setIsTyping(true);
            let i = 0;
            const fullText = currentNode.text || "";
            const interval = setInterval(() => {
                if (i < fullText.length) {
                    setDisplayedText(prev => prev + fullText[i]);
                    i++;
                } else {
                    clearInterval(interval);
                    setIsTyping(false);
                }
            }, 30); // Typewriter speed

            return () => clearInterval(interval);
        }
    }, [currentIndex, isOpen, currentNode]);

    if (!isOpen || !currentNode) return null;

    const handleNext = () => {
        if (isTyping && currentNode.type === 'message') {
            // Skip typewriter
            setDisplayedText(currentNode.text || "");
            setIsTyping(false);
            return;
        }

        if (currentIndex < sequence.sequence_data.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
            setCurrentIndex(0); // Reset for next time
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-8 md:px-20 lg:px-40 pointer-events-none"
            >
                <div 
                    onClick={handleNext}
                    className="relative w-full max-w-4xl mx-auto bg-black/80 backdrop-blur-xl border-2 border-white/20 rounded-[2rem] p-6 md:p-8 shadow-2xl pointer-events-auto cursor-pointer group"
                >
                    {/* Character Portrait */}
                    <div className={`absolute -top-32 ${currentNode.position === 'right' ? 'right-4 md:right-12' : 'left-4 md:left-12'}`}>
                        <motion.img 
                            key={currentNode.character_image}
                            initial={{ opacity: 0, scale: 0.8, x: currentNode.position === 'right' ? 50 : -50 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            src={currentNode.character_image ? `/characters/${currentNode.character_image}` : '/placeholder-character.png'} 
                            alt={currentNode.character_name}
                            className="w-40 h-40 md:w-56 md:h-56 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        />
                    </div>

                    {/* Dialog Content */}
                    <div className="relative z-10 flex flex-col gap-2">
                        {currentNode.type === 'message' ? (
                            <>
                                <div className="flex items-center gap-3">
                                    <span className="px-4 py-1 bg-purple-600 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg shadow-purple-900/40">
                                        {currentNode.character_name}
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-r from-purple-500/50 to-transparent" />
                                </div>

                                <div className="text-white text-lg md:text-2xl font-medium leading-relaxed min-h-[4rem] px-2 py-4">
                                    {displayedText}
                                    {isTyping && <span className="inline-block w-1.5 h-6 bg-purple-500 ml-1 animate-pulse align-middle" />}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 gap-4">
                                <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center text-black shadow-xl shadow-cyan-900/40 animate-bounce">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-cyan-400 font-black uppercase tracking-[0.2em] text-sm mb-1">Triggering Event</h3>
                                    <p className="text-white font-mono text-xs opacity-50">{currentNode.trigger_event}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-2">
                            <div className="flex gap-2">
                                {currentNode.trigger_event && !isTyping && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onEvent) onEvent(currentNode.trigger_event!);
                                        }}
                                        className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-cyan-900/40 border border-white/20 flex items-center gap-2 group/btn"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover/btn:rotate-12 transition-transform"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                                        {currentNode.trigger_event.replace(/_/g, ' ')}
                                    </motion.button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                                <span>{currentIndex + 1} / {sequence.sequence_data.length}</span>
                                <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" />
                                <span>Click to continue</span>
                            </div>
                        </div>
                    </div>

                    {/* Gradient Border Glow */}
                    <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
