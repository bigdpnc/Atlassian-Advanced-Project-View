import React, { useState } from 'react';
import { ProjectTask, Dependency, Resource, BaselineSnapshot, IssueStatus, Priority, IssueType, DependencyType } from '../types/project';
import { X, Calendar, User, Link as LinkIcon, Trash2, GitCommit, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { getEndDateFromDuration, calculateDurationDays, addDays } from '../engine/scheduler';

interface TaskDetailModalProps {
  task: ProjectTask;
  allTasks: ProjectTask[];
  dependencies: Dependency[];
  resources: Resource[];
  activeBaseline: BaselineSnapshot | null;
  onClose: () => void;
  onSave: (updatedTask: ProjectTask, newDependencies?: Dependency[]) => void;
  onDelete: (taskId: string) => void;
  onOpenDependencyModal: (dep: Dependency) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  allTasks,
  dependencies,
  resources,
  activeBaseline,
  onClose,
  onSave,
  onDelete,
  onOpenDependencyModal,
}) => {
  const [title, setTitle] = useState(task.title);
  const [type, setType] = useState<IssueType>(task.type);
  const [status, setStatus] = useState<IssueStatus>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId);
  const [startDate, setStartDate] = useState(task.startDate);
  const [endDate, setEndDate] = useState(task.endDate);
  const [durationDays, setDurationDays] = useState(task.durationDays);
  const [progress, setProgress] = useState(task.progress);
  const [estimatedHours, setEstimatedHours] = useState(task.estimatedHours || 40);
  const [notes, setNotes] = useState(task.notes || '');

  // Predecessor adding state
  const [isAddingPred, setIsAddingPred] = useState(false);
  const [selectedPredId, setSelectedPredId] = useState('');
  const [predType, setPredType] = useState<DependencyType>('FS');
  const [predLag, setPredLag] = useState(0);

  // Filter dependencies for this task
  const predecessors = dependencies.filter(d => d.toTaskId === task.id);
  const successors = dependencies.filter(d => d.fromTaskId === task.id);

  // Baseline data for this task
  const baselineData = activeBaseline?.taskSnapshots[task.id];

  // Recalculate duration when dates change
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    const newEnd = getEndDateFromDuration(newStart, durationDays, true);
    setEndDate(newEnd);
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    const newDur = calculateDurationDays(startDate, newEnd, true);
    setDurationDays(newDur);
  };

  const handleDurationChange = (newDur: number) => {
    const val = Math.max(1, newDur);
    setDurationDays(val);
    const newEnd = getEndDateFromDuration(startDate, val, true);
    setEndDate(newEnd);
  };

  const handleAddPredecessor = () => {
    if (!selectedPredId) return;
    const newDep: Dependency = {
      id: `dep-${Date.now()}`,
      fromTaskId: selectedPredId,
      toTaskId: task.id,
      type: predType,
      lagDays: Number(predLag) || 0,
    };
    const updatedDeps = [...dependencies, newDep];
    setIsAddingPred(false);
    setSelectedPredId('');

    // Trigger save with new dependencies
    onSave(
      {
        ...task,
        title,
        type,
        status,
        priority,
        assigneeId,
        startDate,
        endDate,
        durationDays,
        progress,
        estimatedHours,
        notes,
      },
      updatedDeps
    );
  };

  const handleRemoveDependency = (depId: string) => {
    const updatedDeps = dependencies.filter(d => d.id !== depId);
    onSave(
      {
        ...task,
        title,
        type,
        status,
        priority,
        assigneeId,
        startDate,
        endDate,
        durationDays,
        progress,
        estimatedHours,
        notes,
      },
      updatedDeps
    );
  };

  const handleSaveAll = () => {
    onSave({
      ...task,
      title,
      type,
      status,
      priority,
      assigneeId,
      startDate,
      endDate,
      durationDays,
      progress,
      estimatedHours,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {task.key}
            </span>
            <span className="text-xs text-slate-500 font-medium">Jira Work Item Details</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDelete(task.id)}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-base font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Task summary..."
            />
          </div>

          {/* Issue Meta Grid: Status, Priority, Type, Assignee */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as IssueStatus)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="highest">Highest</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="lowest">Lowest</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Issue Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as IssueType)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="epic">Epic</option>
                <option value="story">Story</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="milestone">Milestone</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {resources.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule & Duration Engine Controls */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                Schedule & Dynamic Timing
              </span>
              <span className="text-[11px] text-blue-600 font-medium">
                Cascades Downstream on Change
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => handleEndDateChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Duration (Workdays)</label>
                <input
                  type="number"
                  min="1"
                  value={durationDays}
                  onChange={e => handleDurationChange(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Progress Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                <span>Progress: {progress}%</span>
                <div className="flex gap-1">
                  {[0, 25, 50, 75, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setProgress(val)}
                      className={`px-1.5 py-0.5 text-[10px] rounded cursor-pointer ${
                        progress === val
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={e => setProgress(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Baseline Comparison Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <GitCommit className="w-4 h-4 text-purple-600" />
                Baseline Comparison & Variance
              </span>
              <span className="text-xs font-mono text-slate-500">
                {activeBaseline ? activeBaseline.name : 'No Active Baseline'}
              </span>
            </div>

            {baselineData ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Baseline Start</span>
                  <span className="text-xs font-semibold text-slate-700">{baselineData.startDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Baseline End</span>
                  <span className="text-xs font-semibold text-slate-700">{baselineData.endDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Slippage Variance</span>
                  <span
                    className={`text-xs font-bold ${
                      (task.baselineVarianceDays || 0) > 0
                        ? 'text-rose-600'
                        : (task.baselineVarianceDays || 0) < 0
                        ? 'text-emerald-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {(task.baselineVarianceDays || 0) > 0
                      ? `+${task.baselineVarianceDays} days delay`
                      : (task.baselineVarianceDays || 0) < 0
                      ? `${task.baselineVarianceDays} days ahead`
                      : 'On Baseline'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">CPM Float (Slack)</span>
                  <span
                    className={`text-xs font-bold ${
                      task.isCritical ? 'text-rose-600' : 'text-slate-700'
                    }`}
                  >
                    {task.isCritical ? '0 days (Critical Path)' : `${task.totalFloatDays || 0} days free slack`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-2">
                No baseline snapshot found for this task. Take a baseline to track slippage.
              </div>
            )}
          </div>

          {/* Predecessors & Successors (Microsoft Project-style Dependency Links) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-blue-600" />
                Predecessors (Inbound Dependencies)
              </span>
              <button
                type="button"
                onClick={() => setIsAddingPred(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Link
              </button>
            </div>

            {/* List existing predecessors */}
            {predecessors.length === 0 ? (
              <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-200">
                No predecessors linked. This task starts freely.
              </div>
            ) : (
              <div className="space-y-2">
                {predecessors.map(dep => {
                  const pred = allTasks.find(t => t.id === dep.fromTaskId);
                  return (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    >
                      <div
                        onClick={() => onOpenDependencyModal(dep)}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <span className="text-xs font-mono font-bold text-blue-600">
                          {pred?.key || dep.fromTaskId}
                        </span>
                        <span className="text-xs text-slate-800 font-medium truncate max-w-xs">
                          {pred?.title}
                        </span>
                        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          {dep.type} {dep.lagDays !== 0 ? (dep.lagDays > 0 ? `+${dep.lagDays}d` : `${dep.lagDays}d`) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenDependencyModal(dep)}
                          className="text-xs text-slate-500 hover:text-blue-600 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDependency(dep.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Adding new predecessor form */}
            {isAddingPred && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-3">
                <span className="text-xs font-bold text-blue-900 block">Link New Predecessor</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedPredId}
                      onChange={e => setSelectedPredId(e.target.value)}
                      className="w-full text-xs font-medium px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="">Select Predecessor Task...</option>
                      {allTasks
                        .filter(t => t.id !== task.id && !predecessors.some(d => d.fromTaskId === t.id))
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            [{t.key}] {t.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={predType}
                      onChange={e => setPredType(e.target.value as DependencyType)}
                      className="w-full text-xs font-medium px-2 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="FS">FS (Finish-to-Start)</option>
                      <option value="SS">SS (Start-to-Start)</option>
                      <option value="FF">FF (Finish-to-Finish)</option>
                      <option value="SF">SF (Start-to-Finish)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium">Lag Days:</span>
                    <input
                      type="number"
                      value={predLag}
                      onChange={e => setPredLag(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPred(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPredecessor}
                      disabled={!selectedPredId}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded disabled:opacity-50"
                    >
                      Save Link
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Successors Notice */}
            <div>
              <span className="text-xs font-bold uppercase text-slate-700 block mb-1">
                Downstream Successors ({successors.length})
              </span>
              {successors.length === 0 ? (
                <div className="text-xs text-slate-400">No downstream tasks depend on this task.</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {successors.map(dep => {
                    const succ = allTasks.find(t => t.id === dep.toTaskId);
                    return (
                      <span
                        key={dep.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 font-medium"
                      >
                        <span className="font-mono font-bold text-amber-700">{succ?.key}</span>
                        <span className="text-[10px] text-amber-600 font-mono">({dep.type})</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Description & Notes */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Notes & Scope</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
              placeholder="Add technical specification, requirements or acceptance criteria..."
            />
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            Save & Recalculate
          </button>
        </div>
      </div>
    </div>
  );
};
