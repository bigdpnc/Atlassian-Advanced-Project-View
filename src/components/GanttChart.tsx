import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ProjectTask, Dependency, Resource, BaselineSnapshot, ProjectEntity } from '../types/project';
import { parseDate, formatDate, addDays, isWeekend, calculateDurationDays, getEndDateFromDuration } from '../engine/scheduler';
import {
  Calendar,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronRight,
  ChevronDown,
  Link as LinkIcon,
  GitCommit,
  Clock,
  Sparkles,
  GitMerge,
} from 'lucide-react';

interface GanttChartProps {
  tasks: ProjectTask[];
  dependencies: Dependency[];
  resources: Resource[];
  projects?: ProjectEntity[];
  activeBaseline: BaselineSnapshot | null;
  showCriticalPath: boolean;
  showBaselineComparison: boolean;
  onSelectTask: (task: ProjectTask) => void;
  onUpdateTaskSchedule: (taskId: string, newStart: string, newDuration: number) => void;
  onOpenDependencyModal: (dep: Dependency) => void;
  onCreateDependency: (fromTaskId: string, toTaskId: string) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  dependencies,
  resources,
  projects = [],
  activeBaseline,
  showCriticalPath,
  showBaselineComparison,
  onSelectTask,
  onUpdateTaskSchedule,
  onOpenDependencyModal,
  onCreateDependency,
}) => {
  // Chart dimensions & zoom
  const [dayWidth, setDayWidth] = useState(38); // pixels per day
  const rowHeight = 44;
  const headerHeight = 52;
  const leftPanelWidth = 320;

  // Drag states
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'resize-end' | 'resize-start' | 'link' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragInitialStart, setDragInitialStart] = useState('');
  const [dragInitialDuration, setDragInitialDuration] = useState(0);
  const [dragDeltaDays, setDragDeltaDays] = useState(0);
  const [linkingSourceTaskId, setLinkingSourceTaskId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Determine timeline boundary
  const { minDate, maxDate, totalDays, dateList } = useMemo(() => {
    let min = '2026-11-01';
    let max = '2026-12-25';

    tasks.forEach(t => {
      if (t.startDate && t.startDate < min) min = t.startDate;
      if (t.endDate && t.endDate > max) max = t.endDate;
    });

    if (activeBaseline) {
      Object.values(activeBaseline.taskSnapshots).forEach(snap => {
        if (snap.startDate && snap.startDate < min) min = snap.startDate;
        if (snap.endDate && snap.endDate > max) max = snap.endDate;
      });
    }

    // Add buffer of 5 days before and 10 days after
    min = addDays(min, -4, false);
    max = addDays(max, 12, false);

    const dates: string[] = [];
    let cur = parseDate(min);
    const end = parseDate(max);

    while (cur <= end) {
      dates.push(formatDate(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    return {
      minDate: min,
      maxDate: max,
      totalDays: dates.length,
      dateList: dates,
    };
  }, [tasks, activeBaseline]);

  // Convert date to X pixel position
  const dateToX = (dateStr: string): number => {
    const start = parseDate(minDate);
    const target = parseDate(dateStr);
    const diffDays = Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays * dayWidth;
  };

  // Convert X pixel position to date
  const xToDate = (x: number): string => {
    const daysOffset = Math.floor(x / dayWidth);
    return addDays(minDate, daysOffset, false);
  };

  // Today marker (2026-11-11)
  const todayDateStr = '2026-11-11';
  const todayX = dateToX(todayDateStr) + dayWidth / 2;

  // Month groupings for timeline header
  const monthGroups = useMemo(() => {
    const groups: { label: string; startDayIndex: number; dayCount: number }[] = [];
    let currentLabel = '';
    let startIndex = 0;
    let count = 0;

    dateList.forEach((dateStr, idx) => {
      const d = parseDate(dateStr);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

      if (label !== currentLabel) {
        if (count > 0) {
          groups.push({ label: currentLabel, startDayIndex: startIndex, dayCount: count });
        }
        currentLabel = label;
        startIndex = idx;
        count = 1;
      } else {
        count++;
      }
    });

    if (count > 0) {
      groups.push({ label: currentLabel, startDayIndex: startIndex, dayCount: count });
    }

    return groups;
  }, [dateList]);

  // Handle Drag Move / Resize / Linking on Timeline
  const handleMouseDown = (
    e: React.MouseEvent,
    taskId: string,
    mode: 'move' | 'resize-end' | 'resize-start' | 'link'
  ) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    hasDraggedRef.current = false;
    setDraggingTaskId(taskId);
    setDragMode(mode);
    setDragStartX(e.clientX);
    setDragInitialStart(task.startDate);
    setDragInitialDuration(task.durationDays);
    setDragDeltaDays(0);

    if (mode === 'link') {
      setLinkingSourceTaskId(taskId);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragMode) return;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left + (timelineScrollRef.current?.scrollLeft || 0) - leftPanelWidth,
          y: e.clientY - rect.top,
        });
      }

      if (dragMode !== 'link' && draggingTaskId) {
        const deltaX = e.clientX - dragStartX;
        if (Math.abs(deltaX) > 4) {
          hasDraggedRef.current = true;
        }
        const deltaDays = Math.round(deltaX / dayWidth);
        setDragDeltaDays(deltaDays);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (dragMode === 'link' && linkingSourceTaskId) {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const taskRowElem = elements.find(el => el.getAttribute('data-task-id'));
        if (taskRowElem) {
          const targetTaskId = taskRowElem.getAttribute('data-task-id');
          if (targetTaskId && targetTaskId !== linkingSourceTaskId) {
            onCreateDependency(linkingSourceTaskId, targetTaskId);
          }
        }
      } else if (draggingTaskId && dragDeltaDays !== 0) {
        if (dragMode === 'move') {
          const newStart = addDays(dragInitialStart, dragDeltaDays, true);
          onUpdateTaskSchedule(draggingTaskId, newStart, dragInitialDuration);
        } else if (dragMode === 'resize-end') {
          const newDuration = Math.max(1, dragInitialDuration + dragDeltaDays);
          onUpdateTaskSchedule(draggingTaskId, dragInitialStart, newDuration);
        } else if (dragMode === 'resize-start') {
          const newStart = addDays(dragInitialStart, dragDeltaDays, true);
          const newDuration = Math.max(1, dragInitialDuration - dragDeltaDays);
          onUpdateTaskSchedule(draggingTaskId, newStart, newDuration);
        }
      }

      setDraggingTaskId(null);
      setDragMode(null);
      setLinkingSourceTaskId(null);
      setMousePos(null);
      setDragDeltaDays(0);
    };

    if (dragMode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    dragMode,
    draggingTaskId,
    dragStartX,
    dragInitialStart,
    dragInitialDuration,
    dragDeltaDays,
    dayWidth,
    linkingSourceTaskId,
    onUpdateTaskSchedule,
    onCreateDependency,
  ]);

  // Center on "Today" on initial load
  useEffect(() => {
    if (timelineScrollRef.current) {
      const scrollPos = todayX - 300;
      timelineScrollRef.current.scrollLeft = Math.max(0, scrollPos);
    }
  }, []);

  // Compute SVG Dependency curves
  const dependencyLines = useMemo(() => {
    return dependencies
      .map(dep => {
        const fromIndex = tasks.findIndex(t => t.id === dep.fromTaskId);
        const toIndex = tasks.findIndex(t => t.id === dep.toTaskId);

        if (fromIndex === -1 || toIndex === -1) return null;

        const fromTask = tasks[fromIndex];
        const toTask = tasks[toIndex];

        const fromX =
          dep.type === 'FS' || dep.type === 'FF'
            ? dateToX(fromTask.endDate) + dayWidth
            : dateToX(fromTask.startDate);

        const fromY = headerHeight + fromIndex * rowHeight + rowHeight / 2;

        const toX =
          dep.type === 'FS' || dep.type === 'SS'
            ? dateToX(toTask.startDate)
            : dateToX(toTask.endDate) + dayWidth;

        const toY = headerHeight + toIndex * rowHeight + rowHeight / 2;

        const isCriticalLine =
          showCriticalPath && fromTask.isCritical && toTask.isCritical;

        const isCrossProject = Boolean(
          fromTask.projectId && toTask.projectId && fromTask.projectId !== toTask.projectId
        );

        // Path drawing (Orthogonal with rounded corners)
        let path = '';
        const dx = toX - fromX;

        if (dx >= 20) {
          const midX = fromX + dx / 2;
          path = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
        } else {
          // Loop around if successor starts before predecessor finishes
          const detourX = fromX + 15;
          const midY = fromY + (toY > fromY ? 1 : -1) * (rowHeight / 2);
          path = `M ${fromX} ${fromY} L ${detourX} ${fromY} L ${detourX} ${midY} L ${toX - 15} ${midY} L ${toX - 15} ${toY} L ${toX} ${toY}`;
        }

        return {
          id: dep.id,
          dep,
          fromTask,
          toTask,
          fromX,
          fromY,
          toX,
          toY,
          path,
          isCriticalLine,
          isCrossProject,
        };
      })
      .filter(Boolean);
  }, [dependencies, tasks, dayWidth, showCriticalPath, minDate]);

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col select-none"
    >
      {/* Top Controls Toolbar */}
      <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => setDayWidth(Math.max(22, dayWidth - 6))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-slate-600">
              {dayWidth <= 26 ? 'Compact' : dayWidth >= 48 ? 'Expanded' : 'Standard'}
            </span>
            <button
              onClick={() => setDayWidth(Math.min(64, dayWidth + 6))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              if (timelineScrollRef.current) {
                timelineScrollRef.current.scrollTo({
                  left: todayX - 250,
                  behavior: 'smooth',
                });
              }
            }}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            Jump to Today
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" />
            <span>Task</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
            <span>Story</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rotate-45 bg-amber-500 inline-block scale-75" />
            <span>Milestone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-purple-600 border-dashed inline-block" />
            <span className="text-purple-700 font-bold">Cross-Project Link</span>
          </div>
          {showBaselineComparison && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 bg-slate-300 border border-slate-400 border-dashed inline-block" />
              <span className="text-slate-500 font-medium">Baseline Ghost</span>
            </div>
          )}
          {showCriticalPath && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-500 ring-2 ring-rose-200 inline-block animate-pulse" />
              <span className="text-rose-700 font-bold">Critical Path (0 Float)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Gantt Split View */}
      <div className="flex relative overflow-hidden h-[580px]">
        {/* Left Side: WBS Task List Table */}
        <div
          style={{ width: `${leftPanelWidth}px` }}
          className="border-r border-slate-200 bg-white flex flex-col shrink-0 z-20 shadow-sm"
        >
          {/* Header */}
          <div
            style={{ height: `${headerHeight}px` }}
            className="px-4 border-b border-slate-200 bg-slate-100/80 flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider"
          >
            <span>Work Item / WBS</span>
            <span>Duration</span>
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-hidden">
            {tasks.map((task, index) => {
              const assignee = resources.find(r => r.id === task.assigneeId);
              return (
                <div
                  key={task.id}
                  style={{ height: `${rowHeight}px` }}
                  onClick={() => onSelectTask(task)}
                  className={`px-4 border-b border-slate-100 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                    task.isCritical && showCriticalPath ? 'bg-rose-50/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="font-mono font-bold text-blue-700 shrink-0 text-[11px]">
                      {task.key}
                    </span>
                    <span className="font-medium text-slate-800 truncate" title={task.title}>
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {assignee && (
                      <img
                        src={assignee.avatar}
                        alt={assignee.name}
                        title={`Assignee: ${assignee.name}`}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    )}
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      {task.durationDays}d
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Timeline Canvas & Bars */}
        <div
          ref={timelineScrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-white"
        >
          <div style={{ width: `${totalDays * dayWidth}px`, height: '100%' }} className="relative">
            {/* Timeline Header (Months & Days) */}
            <div
              style={{ height: `${headerHeight}px` }}
              className="sticky top-0 bg-slate-100/95 border-b border-slate-200 z-10"
            >
              {/* Month Row */}
              <div className="flex h-6 border-b border-slate-200">
                {monthGroups.map((grp, i) => (
                  <div
                    key={i}
                    style={{
                      left: `${grp.startDayIndex * dayWidth}px`,
                      width: `${grp.dayCount * dayWidth}px`,
                    }}
                    className="absolute h-6 px-3 flex items-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200"
                  >
                    {grp.label}
                  </div>
                ))}
              </div>

              {/* Day Row */}
              <div className="flex h-[26px]">
                {dateList.map((dateStr, i) => {
                  const d = parseDate(dateStr);
                  const weekend = isWeekend(d);
                  const isToday = dateStr === todayDateStr;

                  return (
                    <div
                      key={dateStr}
                      style={{
                        left: `${i * dayWidth}px`,
                        width: `${dayWidth}px`,
                      }}
                      className={`absolute h-[26px] flex flex-col items-center justify-center text-[10px] border-r border-slate-200/60 ${
                        weekend ? 'bg-slate-200/40 text-slate-400' : 'text-slate-600'
                      } ${isToday ? 'bg-rose-50 text-rose-700 font-bold' : ''}`}
                    >
                      <span>{d.getUTCDate()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekend Column Shading Background */}
            <div className="absolute inset-0 top-[52px] pointer-events-none">
              {dateList.map((dateStr, i) => {
                const d = parseDate(dateStr);
                if (!isWeekend(d)) return null;
                return (
                  <div
                    key={`bg-${dateStr}`}
                    style={{
                      left: `${i * dayWidth}px`,
                      width: `${dayWidth}px`,
                    }}
                    className="absolute inset-y-0 bg-slate-50/70 border-r border-slate-100"
                  />
                );
              })}
            </div>

            {/* Vertical "Today" Marker Line */}
            <div
              style={{ left: `${todayX}px` }}
              className="absolute inset-y-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
            >
              <div className="sticky top-[52px] -ml-6 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                Today
              </div>
            </div>

            {/* SVG Layer for Dependency Link Arrows */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
              <defs>
                <marker
                  id="arrow-normal"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
                </marker>
                <marker
                  id="arrow-critical"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0.5 L 9 5 L 0 9.5 z" fill="#ef4444" />
                </marker>
                <marker
                  id="arrow-cross"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0.5 L 9 5 L 0 9.5 z" fill="#9333ea" />
                </marker>
              </defs>

              {dependencyLines.map(line => {
                if (!line) return null;
                const strokeColor = line.isCriticalLine
                  ? '#ef4444'
                  : line.isCrossProject
                  ? '#9333ea'
                  : '#94a3b8';
                const markerId = line.isCriticalLine
                  ? 'arrow-critical'
                  : line.isCrossProject
                  ? 'arrow-cross'
                  : 'arrow-normal';

                return (
                  <g key={line.id} className="pointer-events-auto cursor-pointer group">
                    {/* Invisible hit area for easier clicking */}
                    <path
                      d={line.path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="14"
                      onClick={() => onOpenDependencyModal(line.dep)}
                    />
                    {/* Visible line */}
                    <path
                      d={line.path}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={line.isCriticalLine || line.isCrossProject ? '2.5' : '1.5'}
                      strokeDasharray={
                        line.isCriticalLine ? '4 2' : line.isCrossProject ? '6 3' : 'none'
                      }
                      markerEnd={`url(#${markerId})`}
                      className="transition-all group-hover:stroke-blue-600 group-hover:stroke-[3]"
                      onClick={() => onOpenDependencyModal(line.dep)}
                    />
                  </g>
                );
              })}

              {/* Dynamic Connecting Line during Drag-To-Link */}
              {dragMode === 'link' && linkingSourceTaskId && mousePos && (
                (() => {
                  const sIdx = tasks.findIndex(t => t.id === linkingSourceTaskId);
                  if (sIdx === -1) return null;
                  const sTask = tasks[sIdx];
                  const sX = dateToX(sTask.endDate) + dayWidth;
                  const sY = headerHeight + sIdx * rowHeight + rowHeight / 2;

                  return (
                    <line
                      x1={sX}
                      y1={sY}
                      x2={mousePos.x}
                      y2={mousePos.y}
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  );
                })()
              )}
            </svg>

            {/* Task Rows & Interactive Bars */}
            <div className="absolute inset-0 top-[52px]">
              {tasks.map((task, index) => {
                const startX = dateToX(task.startDate);
                const endX = dateToX(task.endDate) + dayWidth;
                const barWidth = Math.max(dayWidth, endX - startX);
                const barY = index * rowHeight + 8;
                const barHeight = rowHeight - 16;

                const baseSnapshot = activeBaseline?.taskSnapshots[task.id];
                const baseStartX = baseSnapshot ? dateToX(baseSnapshot.startDate) : 0;
                const baseEndX = baseSnapshot ? dateToX(baseSnapshot.endDate) + dayWidth : 0;
                const baseWidth = Math.max(dayWidth, baseEndX - baseStartX);

                const isCritical = task.isCritical && showCriticalPath;

                const isBeingDragged = draggingTaskId === task.id && dragDeltaDays !== 0;
                const visualStartX =
                  isBeingDragged && (dragMode === 'move' || dragMode === 'resize-start')
                    ? startX + dragDeltaDays * dayWidth
                    : startX;
                const visualWidth =
                  isBeingDragged && dragMode === 'resize-end'
                    ? Math.max(dayWidth, barWidth + dragDeltaDays * dayWidth)
                    : isBeingDragged && dragMode === 'resize-start'
                    ? Math.max(dayWidth, barWidth - dragDeltaDays * dayWidth)
                    : barWidth;

                return (
                  <div
                    key={task.id}
                    data-task-id={task.id}
                    style={{
                      top: `${index * rowHeight}px`,
                      height: `${rowHeight}px`,
                    }}
                    className="absolute inset-x-0 border-b border-slate-100 flex items-center hover:bg-slate-50/40"
                  >
                    {/* Baseline Ghost Bar (if enabled) */}
                    {showBaselineComparison && baseSnapshot && (
                      <div
                        style={{
                          left: `${baseStartX}px`,
                          width: `${baseWidth}px`,
                          top: `${barY + barHeight - 4}px`,
                          height: '7px',
                        }}
                        className="absolute rounded-xs bg-slate-300 border border-slate-400 border-dashed z-5 opacity-80"
                        title={`Baseline: ${baseSnapshot.startDate} → ${baseSnapshot.endDate} (${baseSnapshot.durationDays}d)`}
                      />
                    )}

                    {/* Main Task Bar */}
                    <div
                      style={{
                        left: `${visualStartX}px`,
                        width: `${visualWidth}px`,
                        top: `${barY}px`,
                        height: `${barHeight}px`,
                      }}
                      onMouseDown={e => handleMouseDown(e, task.id, 'move')}
                      onClick={() => {
                        if (!hasDraggedRef.current) {
                          onSelectTask(task);
                        }
                      }}
                      className={`absolute rounded-lg shadow-xs flex items-center px-2 cursor-grab active:cursor-grabbing transition-shadow z-10 group ${
                        isBeingDragged ? 'ring-2 ring-blue-500 shadow-lg' : ''
                      } ${
                        isCritical
                          ? 'bg-rose-600 text-white ring-2 ring-rose-400/80 shadow-rose-200'
                          : task.type === 'epic'
                          ? 'bg-purple-600 text-white'
                          : task.type === 'story'
                          ? 'bg-emerald-600 text-white'
                          : task.type === 'bug'
                          ? 'bg-rose-500 text-white'
                          : task.type === 'milestone'
                          ? 'bg-amber-500 text-slate-900 font-bold'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {/* Drag Floating Tooltip */}
                      {isBeingDragged && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap pointer-events-none z-30">
                          {dragMode === 'move'
                            ? `Shift ${dragDeltaDays > 0 ? `+${dragDeltaDays}` : dragDeltaDays} days`
                            : `Duration ${Math.max(
                                1,
                                task.durationDays +
                                  (dragMode === 'resize-end' ? dragDeltaDays : -dragDeltaDays)
                              )} days`}
                        </div>
                      )}
                      {/* Progress fill bar */}
                      {task.progress > 0 && task.progress < 100 && (
                        <div
                          style={{ width: `${task.progress}%` }}
                          className="absolute inset-y-0 left-0 bg-black/15 rounded-l-lg pointer-events-none"
                        />
                      )}

                      {/* Bar Content */}
                      <span className="text-[11px] font-semibold truncate relative z-1 pointer-events-none">
                        {task.key}: {task.title}
                      </span>

                      {/* Baseline Variance Badge on bar */}
                      {showBaselineComparison && (task.baselineVarianceDays || 0) !== 0 && (
                        <span
                          className={`ml-1.5 px-1 py-0.2 rounded text-[9px] font-bold shrink-0 relative z-1 ${
                            (task.baselineVarianceDays || 0) > 0
                              ? 'bg-rose-900/60 text-rose-100'
                              : 'bg-emerald-900/60 text-emerald-100'
                          }`}
                        >
                          {(task.baselineVarianceDays || 0) > 0
                            ? `+${task.baselineVarianceDays}d`
                            : `${task.baselineVarianceDays}d`}
                        </span>
                      )}

                      {/* Left Resize Handle */}
                      <div
                        onMouseDown={e => handleMouseDown(e, task.id, 'resize-start')}
                        className="absolute inset-y-0 left-0 w-2 hover:w-3 cursor-ew-resize hover:bg-white/30 rounded-l-lg"
                        title="Drag to change start date"
                      />

                      {/* Right Resize Handle */}
                      <div
                        onMouseDown={e => handleMouseDown(e, task.id, 'resize-end')}
                        className="absolute inset-y-0 right-0 w-2.5 hover:w-3.5 cursor-ew-resize hover:bg-white/30 rounded-r-lg"
                        title="Drag to adjust duration & cascade downstream"
                      />

                      {/* Link Connector Port Handle */}
                      <div
                        onMouseDown={e => handleMouseDown(e, task.id, 'link')}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-crosshair z-30"
                        title="Drag to another task to create dependency link"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
