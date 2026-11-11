import React, { useState } from 'react';
import { BaselineSnapshot, ProjectTask } from '../types/project';
import { GitCommit, Plus, Check, Trash2, Calendar, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { getDaysDifference } from '../engine/scheduler';

interface BaselineManagerModalProps {
  baselines: BaselineSnapshot[];
  activeBaselineId: string | null;
  tasks: ProjectTask[];
  onClose: () => void;
  onSelectActiveBaseline: (id: string) => void;
  onCreateBaseline: (name: string, description: string) => void;
  onDeleteBaseline: (id: string) => void;
}

export const BaselineManagerModal: React.FC<BaselineManagerModalProps> = ({
  baselines,
  activeBaselineId,
  tasks,
  onClose,
  onSelectActiveBaseline,
  onCreateBaseline,
  onDeleteBaseline,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newBaselineName, setNewBaselineName] = useState('');
  const [newBaselineDesc, setNewBaselineDesc] = useState('');

  const activeBaseline = baselines.find(b => b.id === activeBaselineId) || baselines[0] || null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBaselineName.trim()) return;
    onCreateBaseline(newBaselineName.trim(), newBaselineDesc.trim());
    setNewBaselineName('');
    setNewBaselineDesc('');
    setIsCreating(false);
  };

  // Compute slippage summary against active baseline
  let totalSlipped = 0;
  let totalAhead = 0;
  let maxSlippage = 0;

  tasks.forEach(t => {
    const base = activeBaseline?.taskSnapshots[t.id];
    if (base) {
      const variance = getDaysDifference(base.endDate, t.endDate, true);
      if (variance > 0) {
        totalSlipped++;
        if (variance > maxSlippage) maxSlippage = variance;
      } else if (variance < 0) {
        totalAhead++;
      }
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Project Baseline Manager</h2>
              <p className="text-xs text-slate-500">
                Freeze committed schedules, compare plan vs actuals, and track slippage variance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Baseline Selector & Snapshot Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-purple-50/60 p-4 rounded-xl border border-purple-200">
            <div>
              <div className="text-xs font-bold uppercase text-purple-800 tracking-wider">
                Active Comparison Baseline
              </div>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={activeBaselineId || ''}
                  onChange={e => onSelectActiveBaseline(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-purple-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
                >
                  {baselines.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.createdAt})
                    </option>
                  ))}
                </select>
                {activeBaseline && (
                  <span className="text-xs text-purple-700 font-medium">
                    Target End: <strong>{activeBaseline.projectEndDate}</strong>
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              Take New Baseline Snapshot
            </button>
          </div>

          {/* New Baseline Creation Form */}
          {isCreating && (
            <form onSubmit={handleCreate} className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-3">
              <div className="text-xs font-bold uppercase text-slate-700">Snapshot Current Project Schedule</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Baseline Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sprint 2 Re-baseline / Milestone 1 Lock"
                    value={newBaselineName}
                    onChange={e => setNewBaselineName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Scope adjustments approved by steering committee"
                    value={newBaselineDesc}
                    onChange={e => setNewBaselineDesc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Save Snapshot
                </button>
              </div>
            </form>
          )}

          {/* Variance KPI Summary */}
          {activeBaseline && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-xs font-semibold text-slate-500">Tasks Slipped (Delayed)</div>
                <div className="text-xl font-bold text-rose-600 mt-1">
                  {totalSlipped} <span className="text-xs font-normal text-slate-500">tasks</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Downstream dependencies impacted
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-xs font-semibold text-slate-500">Max Task Slippage</div>
                <div className="text-xl font-bold text-amber-600 mt-1">
                  +{maxSlippage} <span className="text-xs font-normal text-slate-500">working days</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Longest delay drift from baseline
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-xs font-semibold text-slate-500">Tasks Ahead of Schedule</div>
                <div className="text-xl font-bold text-emerald-600 mt-1">
                  {totalAhead} <span className="text-xs font-normal text-slate-500">tasks</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Finished or starting early
                </div>
              </div>
            </div>
          )}

          {/* Detailed Task Baseline Variance Grid */}
          <div>
            <div className="text-xs font-bold uppercase text-slate-700 mb-2">
              Detailed Task Baseline vs. Current Plan Variance
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Key</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Baseline Dates</th>
                    <th className="py-2.5 px-3">Current Dates</th>
                    <th className="py-2.5 px-3">Variance</th>
                    <th className="py-2.5 px-3">Slack / Float</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map(t => {
                    const base = activeBaseline?.taskSnapshots[t.id];
                    const variance = base ? getDaysDifference(base.endDate, t.endDate, true) : 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{t.key}</td>
                        <td className="py-2 px-3 font-medium text-slate-800 truncate max-w-xs">{t.title}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                          {base ? `${base.startDate} → ${base.endDate}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-800 font-mono text-[11px]">
                          {t.startDate} → {t.endDate}
                        </td>
                        <td className="py-2 px-3">
                          {base ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                variance > 0
                                  ? 'bg-rose-100 text-rose-700'
                                  : variance < 0
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {variance > 0 ? `+${variance}d delay` : variance < 0 ? `${variance}d ahead` : '0d (On Plan)'}
                            </span>
                          ) : (
                            <span className="text-slate-400">New Task</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-[11px] font-medium ${
                              t.isCritical ? 'text-rose-600 font-bold' : 'text-slate-600'
                            }`}
                          >
                            {t.isCritical ? 'Critical (0d)' : `${t.totalFloatDays || 0}d slack`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {baselines.length} historical baseline snapshot(s) stored.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
