import React from 'react';
import { FlaskConical, Check, Undo2, ArrowRight } from 'lucide-react';

interface WhatIfBannerProps {
  originalFinishDate: string;
  currentFinishDate: string;
  shiftedTasksCount: number;
  onApply: () => void;
  onDiscard: () => void;
}

export const WhatIfBanner: React.FC<WhatIfBannerProps> = ({
  originalFinishDate,
  currentFinishDate,
  shiftedTasksCount,
  onApply,
  onDiscard,
}) => {
  const d1 = new Date(currentFinishDate).getTime();
  const d2 = new Date(originalFinishDate).getTime();
  const diffDays = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-amber-500 text-slate-950 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-amber-600 animate-in slide-in-from-top duration-150">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-black/15 flex items-center justify-center text-slate-950">
          <FlaskConical className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-wider">
            What-If Schedule Simulation Active
          </div>
          <div className="text-xs font-medium flex items-center gap-2">
            <span>
              Original Target: <strong>{originalFinishDate}</strong>
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
            <span>
              Simulated Target: <strong>{currentFinishDate}</strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                diffDays > 0 ? 'bg-black/20 text-rose-950' : 'bg-black/20 text-emerald-950'
              }`}
            >
              {diffDays > 0 ? `+${diffDays} days delay` : diffDays < 0 ? `${diffDays} days saved` : 'No date change'}
            </span>
            <span className="text-slate-800 text-[11px]">({shiftedTasksCount} task(s) shifted in simulation)</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onDiscard}
          className="px-3 py-1 bg-black/15 hover:bg-black/25 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Undo2 className="w-3.5 h-3.5" /> Discard Changes
        </button>
        <button
          onClick={onApply}
          className="px-4 py-1 bg-slate-950 hover:bg-black text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" /> Commit to Real Schedule
        </button>
      </div>
    </div>
  );
};
