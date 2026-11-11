import React, { useState } from 'react';
import { ProjectTask, Dependency, Resource, IssueStatus, Priority, IssueType, ProjectEntity } from '../types/project';
import {
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Filter,
  Search,
  ExternalLink,
  Zap,
  Globe,
  GitMerge,
} from 'lucide-react';

interface TaskTableProps {
  tasks: ProjectTask[];
  dependencies: Dependency[];
  resources: Resource[];
  projects?: ProjectEntity[];
  onSelectTask: (task: ProjectTask) => void;
  onUpdateTaskDate: (taskId: string, start: string, duration: number) => void;
  onUpdateTaskStatus: (taskId: string, status: IssueStatus) => void;
  onUpdateTaskAssignee: (taskId: string, assigneeId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddNewTask: () => void;
  onOpenDependencyModal: (dep: Dependency) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  dependencies,
  resources,
  projects = [],
  onSelectTask,
  onUpdateTaskDate,
  onUpdateTaskStatus,
  onUpdateTaskAssignee,
  onDeleteTask,
  onAddNewTask,
  onOpenDependencyModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchKey = task.key.toLowerCase().includes(q);
      const matchTitle = task.title.toLowerCase().includes(q);
      if (!matchKey && !matchTitle) return false;
    }
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }
    if (projectFilter !== 'all' && task.projectId !== projectFilter) {
      return false;
    }
    if (criticalOnly && !task.isCritical) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: IssueStatus) => {
    switch (status) {
      case 'done':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">DONE</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">IN PROGRESS</span>;
      case 'in_review':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">IN REVIEW</span>;
      case 'todo':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700">TO DO</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600">BACKLOG</span>;
    }
  };

  const getTypeIcon = (type: IssueType) => {
    switch (type) {
      case 'epic':
        return <span className="w-2.5 h-2.5 rounded-xs bg-purple-600 shrink-0" title="Epic" />;
      case 'story':
        return <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 shrink-0" title="Story" />;
      case 'task':
        return <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 shrink-0" title="Task" />;
      case 'bug':
        return <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 shrink-0" title="Bug" />;
      case 'milestone':
        return <span className="w-2.5 h-2.5 rotate-45 bg-amber-500 shrink-0" title="Milestone" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by summary or key..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>
          </div>

          {projects.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="all">All Projects ({tasks.length})</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.key}] {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={criticalOnly}
              onChange={e => setCriticalOnly(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-rose-600" /> Critical Path Only
            </span>
          </label>
        </div>

        <button
          onClick={onAddNewTask}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Work Item
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
              <th className="py-2.5 px-3 min-w-[90px]">Key</th>
              <th className="py-2.5 px-3 min-w-[260px]">Summary</th>
              <th className="py-2.5 px-3 min-w-[120px]">Status</th>
              <th className="py-2.5 px-3 min-w-[160px]">Assignee</th>
              <th className="py-2.5 px-3 min-w-[110px]">Start Date</th>
              <th className="py-2.5 px-3 min-w-[110px]">End Date</th>
              <th className="py-2.5 px-3 min-w-[80px] text-center">Duration</th>
              <th className="py-2.5 px-3 min-w-[160px]">Predecessors</th>
              <th className="py-2.5 px-3 min-w-[100px]">Slack / Float</th>
              <th className="py-2.5 px-3 min-w-[100px]">Baseline Var.</th>
              <th className="py-2.5 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-400">
                  No matching tasks found.
                </td>
              </tr>
            ) : (
              filteredTasks.map(task => {
                const assignee = resources.find(r => r.id === task.assigneeId);
                const taskPreds = dependencies.filter(d => d.toTaskId === task.id);

                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      task.isCritical ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    {/* Key */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {getTypeIcon(task.type)}
                        {(() => {
                          const project = projects.find(p => p.id === task.projectId);
                          return (
                            project && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0"
                                style={{ backgroundColor: `${project.color}18`, color: project.color }}
                                title={`Project: ${project.name}`}
                              >
                                {project.key}
                              </span>
                            )
                          );
                        })()}
                        <button
                          onClick={() => onSelectTask(task)}
                          className="font-mono font-bold text-blue-700 hover:underline cursor-pointer"
                        >
                          {task.key}
                        </button>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-2.5 px-3">
                      <div
                        onClick={() => onSelectTask(task)}
                        className="font-medium text-slate-900 cursor-pointer hover:text-blue-600 truncate max-w-sm"
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3">
                      <select
                        value={task.status}
                        onChange={e => onUpdateTaskStatus(task.id, e.target.value as IssueStatus)}
                        className="text-xs font-semibold bg-transparent border-0 rounded cursor-pointer focus:ring-1 focus:ring-blue-500 py-0.5"
                      >
                        <option value="backlog">Backlog</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="in_review">In Review</option>
                        <option value="done">Done</option>
                      </select>
                    </td>

                    {/* Assignee */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {assignee ? (
                          <>
                            <img
                              src={assignee.avatar}
                              alt={assignee.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="text-slate-800 truncate max-w-[110px]">{assignee.name}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>

                    {/* Start Date */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      <input
                        type="date"
                        value={task.startDate}
                        onChange={e => onUpdateTaskDate(task.id, e.target.value, task.durationDays)}
                        className="px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white"
                      />
                    </td>

                    {/* End Date */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      {task.endDate}
                    </td>

                    {/* Duration */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={task.durationDays}
                        onChange={e =>
                          onUpdateTaskDate(task.id, task.startDate, parseInt(e.target.value) || 1)
                        }
                        className="w-12 px-1 py-0.5 text-center border border-slate-200 rounded text-xs bg-white font-semibold"
                      />
                    </td>

                    {/* Predecessors */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {taskPreds.length === 0 ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          taskPreds.map(dep => {
                            const pred = tasks.find(t => t.id === dep.fromTaskId);
                            const isCross = Boolean(
                              pred?.projectId && task.projectId && pred.projectId !== task.projectId
                            );
                            return (
                              <button
                                key={dep.id}
                                onClick={() => onOpenDependencyModal(dep)}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium cursor-pointer transition-colors ${
                                  isCross
                                    ? 'bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-800'
                                    : 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700'
                                }`}
                                title={
                                  isCross
                                    ? `Cross-Project Link: ${pred?.title} (${dep.type})`
                                    : `Predecessor: ${pred?.title} (${dep.type})`
                                }
                              >
                                {isCross && <GitMerge className="w-2.5 h-2.5 text-purple-600" />}
                                {pred?.key || dep.fromTaskId}
                                <span className="text-slate-500 font-normal">
                                  {dep.type}
                                  {dep.lagDays !== 0 ? (dep.lagDays > 0 ? `+${dep.lagDays}` : dep.lagDays) : ''}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </td>

                    {/* CPM Slack / Float */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          task.isCritical
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {task.isCritical ? '0d (Critical)' : `${task.totalFloatDays || 0}d slack`}
                      </span>
                    </td>

                    {/* Baseline Variance */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          (task.baselineVarianceDays || 0) > 0
                            ? 'bg-rose-100 text-rose-700'
                            : (task.baselineVarianceDays || 0) < 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {(task.baselineVarianceDays || 0) > 0
                          ? `+${task.baselineVarianceDays}d delay`
                          : (task.baselineVarianceDays || 0) < 0
                          ? `${task.baselineVarianceDays}d ahead`
                          : '0d (Plan)'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectTask(task)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                          title="Inspect work item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Delete work item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
