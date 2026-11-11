import React, { useState } from 'react';
import { Resource, ProjectTask, ResourceWorkload, ProjectEntity } from '../types/project';
import { parseDate, formatDate, isWeekend } from '../engine/scheduler';
import { Users, AlertTriangle, CheckCircle2, Wand2, Info, ChevronRight, X, Globe } from 'lucide-react';

interface ResourceHeatmapProps {
  resources: Resource[];
  tasks: ProjectTask[];
  workloads: Record<string, ResourceWorkload>;
  projects?: ProjectEntity[];
  onAutoLevel: () => void;
  onSelectTask: (task: ProjectTask) => void;
}

export const ResourceHeatmap: React.FC<ResourceHeatmapProps> = ({
  resources,
  tasks,
  workloads,
  projects = [],
  onAutoLevel,
  onSelectTask,
}) => {
  const [selectedCell, setSelectedCell] = useState<{
    resource: Resource;
    date: string;
    hours: number;
    tasks: ProjectTask[];
  } | null>(null);

  // Determine timeline range from tasks
  let minDate = '2026-11-02';
  let maxDate = '2026-12-18';

  tasks.forEach(t => {
    if (t.startDate && t.startDate < minDate) minDate = t.startDate;
    if (t.endDate && t.endDate > maxDate) maxDate = t.endDate;
  });

  // Generate working days list
  const dateList: string[] = [];
  let curr = parseDate(minDate);
  const end = parseDate(maxDate);

  while (curr <= end) {
    if (!isWeekend(curr)) {
      dateList.push(formatDate(curr));
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  // Count total over-allocations across all resources
  const totalOverallocatedDays = Object.values(workloads).reduce(
    (sum, w) => sum + w.totalOverallocatedDays,
    0
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Heatmap Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Resource Workload & Capacity Leveling
              {totalOverallocatedDays > 0 ? (
                <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {totalOverallocatedDays} conflict day(s) detected
                </span>
              ) : (
                <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Optimal workload distribution
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Real-time resource allocation updates dynamically when task schedules or dependencies shift.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onAutoLevel}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Auto-level resources by shifting non-critical tasks with available float"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Auto-Level Resource Schedule
          </button>
        </div>
      </div>

      {/* Info notice about leveling */}
      <div className="px-6 py-2 bg-blue-50/50 border-b border-blue-100 text-[11px] text-blue-800 flex items-center gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          <strong>Microsoft Project Leveling:</strong> When two or more tasks are assigned to the same team member on the same day, their hours combine. If total hours exceed 8h/day (100%), the cell flags in red. Auto-Leveling shifts non-critical tasks within their float window to eliminate bottlenecks without moving the final project deadline.
        </span>
      </div>

      {/* Heatmap Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
              <th className="py-2.5 px-4 min-w-[220px] sticky left-0 bg-slate-100 z-10 shadow-r">
                Team Member & Role
              </th>
              <th className="py-2.5 px-3 min-w-[90px] text-center">Peak Load</th>
              {dateList.map(dateStr => {
                const d = parseDate(dateStr);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
                const dayNum = d.getUTCDate();
                const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
                return (
                  <th
                    key={dateStr}
                    className="py-1.5 px-2 min-w-[44px] text-center border-l border-slate-200 font-medium text-[10px]"
                  >
                    <div className="text-slate-400 font-normal">{month}</div>
                    <div className="font-bold text-slate-700">{dayNum}</div>
                    <div className="text-[9px] text-slate-400 uppercase">{dayName}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resources.map(resource => {
              const workload = workloads[resource.id];
              const peak = workload?.peakAllocationPercent || 0;
              const hasOver = (workload?.totalOverallocatedDays || 0) > 0;

              return (
                <tr key={resource.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Resource Column */}
                  <td className="py-2.5 px-4 sticky left-0 bg-white z-10 shadow-r border-r border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={resource.avatar}
                        alt={resource.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{resource.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{resource.role}</div>
                      </div>
                    </div>
                  </td>

                  {/* Peak Load Badge */}
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        peak > 100
                          ? 'bg-rose-100 text-rose-700'
                          : peak === 100
                          ? 'bg-amber-100 text-amber-700'
                          : peak > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {peak}%
                    </span>
                  </td>

                  {/* Daily Workload Cells */}
                  {dateList.map(dateStr => {
                    const day = workload?.days[dateStr];
                    const hours = day ? day.allocatedHours : 0;
                    const isOver = day?.overallocated || false;
                    const capacity = day ? day.capacityHours : 8;

                    let bgClass = 'bg-transparent text-slate-300';
                    if (hours > 0) {
                      if (isOver) {
                        bgClass = 'bg-rose-100 text-rose-800 font-bold border border-rose-300 shadow-xs';
                      } else if (hours === capacity) {
                        bgClass = 'bg-emerald-50 text-emerald-700 font-semibold';
                      } else {
                        bgClass = 'bg-blue-50 text-blue-700 font-medium';
                      }
                    }

                    const dayTasks = (day?.taskIds || [])
                      .map(id => tasks.find(t => t.id === id)!)
                      .filter(Boolean);

                    return (
                      <td
                        key={dateStr}
                        onClick={() => {
                          if (hours > 0) {
                            setSelectedCell({
                              resource,
                              date: dateStr,
                              hours,
                              tasks: dayTasks,
                            });
                          }
                        }}
                        className={`p-1 text-center border-l border-slate-100 transition-colors ${
                          hours > 0 ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''
                        }`}
                      >
                        <div
                          className={`w-full py-1.5 rounded text-[11px] font-mono flex items-center justify-center ${bgClass}`}
                          title={
                            hours > 0
                              ? `${resource.name}: ${hours}h on ${dateStr} (${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''})`
                              : 'No tasks scheduled'
                          }
                        >
                          {hours > 0 ? `${hours}h` : '—'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Day Inspector Popover / Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {selectedCell.resource.name} • {selectedCell.date}
                </h4>
                <div className="text-xs text-slate-500">
                  Total Allocation: <strong>{selectedCell.hours} hours</strong> / 8h capacity
                  {selectedCell.hours > 8 && (
                    <span className="text-rose-600 font-bold ml-1.5">(Overallocated!)</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <div className="text-xs font-bold uppercase text-slate-600 mb-2">
                Active Tasks on this Day ({selectedCell.tasks.length})
              </div>
              <div className="space-y-2">
                {selectedCell.tasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedCell(null);
                      onSelectTask(t);
                    }}
                    className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const proj = projects.find(p => p.id === t.projectId);
                          return (
                            proj && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono shrink-0"
                                style={{ backgroundColor: `${proj.color}18`, color: proj.color }}
                              >
                                {proj.key}
                              </span>
                            )
                          );
                        })()}
                        <span className="text-xs font-mono font-bold text-blue-600">{t.key}</span>
                        <span className="text-xs font-semibold text-slate-800">{t.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {t.startDate} → {t.endDate} ({t.durationDays} days) • {t.estimatedHours}h total
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedCell(null)}
                className="px-3.5 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
