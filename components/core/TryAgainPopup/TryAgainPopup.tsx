'use client';
import { useGame } from '@/store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

export default function TryAgainPopup() {
  const { state, dispatch } = useGame();
  
  return (
    <AnimatePresence>
      {state.showTryAgainPopup && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch({ type: 'HIDE_TRY_AGAIN' })}
            className="absolute inset-0 bg-[#181818]/90 backdrop-blur-md" 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative max-w-md w-full bg-[#171717] border border-[#ff6a6a]/30 p-10 shadow-2xl overflow-hidden"
          >
            {/* Technical Accents */}
            <div className="absolute top-0 left-0 h-4 w-4 border-l border-t border-[#ff6a6a]" />
            <div className="absolute top-0 right-0 h-4 w-4 border-r border-t border-[#ff6a6a]" />
            <div className="absolute bottom-0 left-0 h-4 w-4 border-l border-b border-[#ff6a6a]" />
            <div className="absolute bottom-0 right-0 h-4 w-4 border-r border-b border-[#ff6a6a]" />

            <div className="flex flex-col items-center text-center">
              <div className="mb-8 relative">
                <div className="absolute inset-0 bg-[#ff6a6a]/20 blur-2xl rounded-full" />
                <div className="relative h-16 w-16 border border-[#ff6a6a]/30 grid place-items-center text-[#ff6a6a]">
                  <AlertTriangle size={32} />
                </div>
              </div>

              <h3 className="font-serif text-3xl uppercase tracking-tighter text-white mb-4">
                Flow <span className="text-[#ff6a6a]">Incorrect</span>
              </h3>
              
              <p className="font-sans text-[13px] text-[#929292] leading-relaxed mb-10 max-w-[28ch]">
                Your current persona card alignment does not match the target persona.
              </p>

              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={() => dispatch({ type: 'RESET_BOARD' })}
                  className="group flex items-center justify-center gap-3 w-full h-12 bg-[#ff6a6a] text-[#171717] font-mono text-[11px] uppercase tracking-widest font-bold hover:bg-white transition-all duration-300"
                >
                  <RotateCcw size={14} className="group-hover:rotate-[-90deg] transition-transform duration-500" />
                  Wipe Flow & try again
                </button>
                
                <button 
                  onClick={() => dispatch({ type: 'HIDE_TRY_AGAIN' })}
                  className="w-full h-12 border border-[#2e2e2e] text-[#5b5b5b] font-mono text-[10px] uppercase tracking-widest hover:border-[#DEF767] hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
