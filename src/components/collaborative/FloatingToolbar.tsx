import React from 'react';
import { MousePointer2, Pencil, Eraser, Type, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export type ToolType = 'select' | 'draw' | 'erase' | 'text' | 'pan';

interface FloatingToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  isOnline: boolean;
  connectedUsersCount: number;
  connectionError?: string | null;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  activeTool,
  onToolChange,
  isOnline,
  connectedUsersCount,
  connectionError = null,
}) => {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'draw', icon: Pencil, label: 'Draw (P)' },
    { id: 'erase', icon: Eraser, label: 'Erase (E)' },
    { id: 'text', icon: Type, label: 'Text (T)' },
  ] as const;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-40">
      
      {/* Error State Toast */}
      {connectionError && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm font-medium"
          role="alert"
        >
          <AlertCircle size={14} />
          {connectionError}
        </motion.div>
      )}

      <div className="flex items-center gap-4">
        {/* Main Toolbar */}
        <div
          className="flex items-center p-1.5 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
          role="toolbar"
          aria-label="Canvas Tools"
        >
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;

            return (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                  isActive
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                }`}
                aria-pressed={isActive}
                aria-label={tool.label}
                title={tool.label}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tool-indicator"
                    className="absolute inset-0 bg-indigo-500/20 rounded-xl border border-indigo-500/50"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
                <Icon size={18} className="relative z-10" />
              </button>
            );
          })}
        </div>

        {/* Presence Indicator */}
        <div className="flex items-center px-4 py-2 h-13 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-2" aria-live="polite">
            <div className="relative flex h-3 w-3">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </div>
            <span className="text-sm font-medium text-zinc-300 tabular-nums">
              {connectedUsersCount} {connectedUsersCount === 1 ? 'user' : 'users'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
