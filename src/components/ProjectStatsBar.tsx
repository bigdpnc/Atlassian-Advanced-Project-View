import React from 'react';
import { ProjectTask, BaselineSnapshot, ResourceWorkload } from '../types/project';
import { Calendar, AlertTriangle, Zap, GitCommit, Clock, CheckCircle2 } from 'lucide-react';

interface ProjectStatsBarProps {
  tasks: ProjectTask[];
  activeBaseline: BaselineSnapshot | null;
  workloads: Record<string, ResourceWorkload>;
  onAutoLevel: () => void;
  onOpenBaselineModal: () => void;
  showCriticalPath: boolean;
  onToggleCriticalPath: () => void;
}

export const ProjectStatsBar: React.FC<ProjectStatsBarProps> = ({
  tasks,
  activeBaseline,
  workloads,
  onAutoLevel,
  onOpenBaselineModal,
  showCriticalPath,
  onToggleCriticalPath,
}) => {
  // Compute overall project end date
  let projectFinishDate = '';
  tasks.forEach(t => {
    if (!projectFinishDate || t.endDate > projectFinishDate) {
      projectFinishDate = t.endDate;
    }
  });

  const baselineFinish = activeBaseline?.projectEndDate || '';
  
  // Calculate project-level slippage
  let projectVarianceDays = 0;
  if (projectFinishDate && baselineFinish) {
    const d1 = new Date(projectFinishDate).getTime();
    const d2 = new Date(baselineFinish).getTime();
    projectVarianceDays = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
  }

  // Count critical tasks
  const criticalCount = tasks.filter(t => t.isCritical).length;

  // Count over-allocated resources
  const overAllocatedResources = Object.values(workloads).filter(w => w.totalOverallocatedDays > 0);

  // Overall completion %
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const avgProgress = totalTasks > 0
    ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasks)
    : 0;

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Project Finish Date & Slippage */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Project Finish Target
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{projectFinishDate || 'N/A'}</span>
              {activeBaseline && (
                <span
                  onClick={onOpenBaselineModal}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors ${
                    projectVarianceDays > 0
                      ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                      : projectVarianceDays < 0
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={`Baseline Target: ${baselineFinish}. Click to view baseline report.`}
                >
                  {projectVarianceDays > 0
                    ? `+${projectVarianceDays}d delay`
                    : projectVarianceDays < 0
                    ? `${projectVarianceDays}d ahead`
                    : 'On Baseline'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden sm:block" />

        {/* Critical Path Indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleCriticalPath}
            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
              showCriticalPath
                ? 'bg-rose-50 border-rose-300 text-rose-600 ring-2 ring-rose-200'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
            title="Toggle Critical Path Method (CPM) Highlighting"
          >
            <Zap className="w-5 h-5" />
          </button>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              Critical Path (CPM)
              <span className="text-[10px] text-slate-400 font-normal">0 Slack</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {criticalCount} <span className="text-xs font-normal text-slate-500">of {totalTasks} tasks</span>
              </span>
              <button
                onClick={onToggleCriticalPath}
                className={`text-xs font-medium cursor-pointer underline ${
                  showCriticalPath ? 'text-rose-600' : 'text-blue-600'
                }`}
              >
                {showCriticalPath ? 'Hide Path' : 'Highlight Path'}
              </button>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden sm:block" />

        {/* Resource Workload Status */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center ${
              overAllocatedResources.length > 0
                ? 'bg-amber-50 border-amber-300 text-amber-600'
                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}
          >
            {overAllocatedResources.length > 0 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Resource Capacity
            </div>
            <div className="flex items-center gap-2">
              {overAllocatedResources.length > 0 ? (
                <>
                  <span className="text-sm font-bold text-amber-700">
                    {overAllocatedResources.length} over-allocated
                  </span>
                  <button
                    onClick={onAutoLevel}
                    className="text-xs px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                    title="Microsoft Project-style Auto-Leveling: shifts non-critical tasks to resolve capacity conflicts"
                  >
                    <Clock className="w-3 h-3" />
                    Auto-Level
                  </button>
                </>
              ) : (
                <span className="text-sm font-semibold text-emerald-700">
                  Optimal (100% capacity balanced)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden md:block" />

        {/* Baseline Snapshot Active */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenBaselineModal}
            className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
            title="Manage Baseline Snapshots & View Slippage History"
          >
            <GitCommit className="w-5 h-5" />
          </button>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Baseline
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800 truncate max-w-[160px]">
                {activeBaseline ? activeBaseline.name : 'No Baseline'}
              </span>
              <button
                onClick={onOpenBaselineModal}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                Manage
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Metric */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs text-slate-500 font-medium">Completed: {completedTasks}/{totalTasks}</div>
          <div className="text-sm font-bold text-slate-900">{avgProgress}% done</div>
        </div>
        <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${avgProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
