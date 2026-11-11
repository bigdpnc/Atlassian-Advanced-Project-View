import React, { useState } from 'react';
import { Dependency, DependencyType, ProjectTask } from '../types/project';
import { X, ArrowRight, Trash2, Link as LinkIcon, Info } from 'lucide-react';

interface DependencyLinkModalProps {
  dependency: Dependency | null;
  tasks: ProjectTask[];
  onClose: () => void;
  onSave: (updated: Dependency) => void;
  onDelete: (id: string) => void;
}

export const DependencyLinkModal: React.FC<DependencyLinkModalProps> = ({
  dependency,
  tasks,
  onClose,
  onSave,
  onDelete,
}) => {
  if (!dependency) return null;

  const [depType, setDepType] = useState<DependencyType>(dependency.type);
  const [lagDays, setLagDays] = useState<number>(dependency.lagDays || 0);

  const predTask = tasks.find(t => t.id === dependency.fromTaskId);
  const succTask = tasks.find(t => t.id === dependency.toTaskId);

  const handleSave = () => {
    onSave({
      ...dependency,
      type: depType,
      lagDays: Number(lagDays) || 0,
    });
  };

  const linkDescriptions: Record<DependencyType, { title: string; desc: string }> = {
    FS: {
      title: 'Finish-to-Start (FS)',
      desc: 'Successor task cannot start until Predecessor finishes. Standard sequential link.',
    },
    SS: {
      title: 'Start-to-Start (SS)',
      desc: 'Successor task cannot start until Predecessor starts. Enables parallel workflows.',
    },
    FF: {
      title: 'Finish-to-Finish (FF)',
      desc: 'Successor task cannot finish until Predecessor finishes. Synchronized completion.',
    },
    SF: {
      title: 'Start-to-Finish (SF)',
      desc: 'Successor task cannot finish until Predecessor starts. Rare shift/handover link.',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-base">
            <LinkIcon className="w-5 h-5 text-blue-600" />
            <span>Edit Task Dependency Link</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Visual Link Diagram */}
          <div className="flex items-center justify-between bg-slate-100 p-4 rounded-lg border border-slate-200">
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Predecessor</span>
              <div className="text-xs font-mono font-semibold text-blue-700">{predTask?.key}</div>
              <div className="text-sm font-medium text-slate-800 truncate">{predTask?.title}</div>
            </div>

            <div className="px-3 flex flex-col items-center">
              <span className="text-[11px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded mb-1">
                {depType} {lagDays !== 0 ? (lagDays > 0 ? `+${lagDays}d` : `${lagDays}d`) : ''}
              </span>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>

            <div className="flex-1 min-w-0 pl-2 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Successor</span>
              <div className="text-xs font-mono font-semibold text-blue-700">{succTask?.key}</div>
              <div className="text-sm font-medium text-slate-800 truncate">{succTask?.title}</div>
            </div>
          </div>

          {/* Dependency Type Selection */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
              Relationship Type (PDM)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['FS', 'SS', 'FF', 'SF'] as DependencyType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDepType(type)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    depType === type
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-semibold text-sm text-slate-800">{linkDescriptions[type].title}</div>
                  <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {linkDescriptions[type].desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Lead / Lag Days */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase text-slate-600">
                Lag / Lead Time (Working Days)
              </label>
              <span className="text-xs text-slate-400">
                Positive = delay (lag), Negative = overlap (lead)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={lagDays}
                onChange={e => setLagDays(parseInt(e.target.value) || 0)}
                className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-600">
                {lagDays === 0
                  ? 'Zero lag (immediate trigger)'
                  : lagDays > 0
                  ? `+${lagDays} working days delay after condition met`
                  : `${lagDays} working days accelerated start (lead)`}
              </span>
            </div>
          </div>

          {/* Real-time notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Dynamic Cascade Notice:</strong> Changing this dependency will immediately recalculate the downstream project schedule and ripple all subsequent task deadlines in real-time.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => onDelete(dependency.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete Link
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-xs transition-colors cursor-pointer"
            >
              Update & Cascade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
