import React, { useState, useMemo, useCallback } from 'react';
import {
  ProjectTask,
  Dependency,
  Resource,
  BaselineSnapshot,
  IssueStatus,
  IssueType,
  ProjectEntity,
} from './types/project';
import {
  INITIAL_TASKS,
  INITIAL_DEPENDENCIES,
  INITIAL_RESOURCES,
  INITIAL_BASELINES,
  INITIAL_PROJECTS,
} from './engine/sampleData';
import {
  cascadeSchedule,
  calculateCPM,
  applyBaselineComparison,
  calculateResourceWorkloads,
  autoLevelResources,
  addDays,
  formatDate,
  getEndDateFromDuration,
} from './engine/scheduler';
import { Navbar } from './components/Navbar';
import { ProjectStatsBar } from './components/ProjectStatsBar';
import { GanttChart } from './components/GanttChart';
import { TaskTable } from './components/TaskTable';
import { ResourceHeatmap } from './components/ResourceHeatmap';
import { BaselineManagerModal } from './components/BaselineManagerModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { DependencyLinkModal } from './components/DependencyLinkModal';
import { WhatIfBanner } from './components/WhatIfBanner';
import { DocumentationModal } from './components/DocumentationModal';
import { QAScenarioModal } from './components/QAScenarioModal';
import { Sparkles, ArrowRight, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Navigation & View Mode
  const [currentView, setCurrentView] = useState<'gantt' | 'grid' | 'resources' | 'baselines'>(
    'gantt'
  );

  // Settings
  const [autoCascade, setAutoCascade] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [showBaselineComparison, setShowBaselineComparison] = useState(true);
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [activeBaselineId, setActiveBaselineId] = useState<string | null>('base-initial');

  // Core Multi-Project Portfolio State
  const [projects, setProjects] = useState<ProjectEntity[]>(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [baselines, setBaselines] = useState<BaselineSnapshot[]>(INITIAL_BASELINES);
  const [dependencies, setDependencies] = useState<Dependency[]>(INITIAL_DEPENDENCIES);

  // Tasks initialized with baseline comparison & CPM across entire portfolio
  const [tasks, setTasks] = useState<ProjectTask[]>(() => {
    const activeBase = INITIAL_BASELINES[0] || null;
    const cpm = calculateCPM(INITIAL_TASKS, INITIAL_DEPENDENCIES, true);
    return applyBaselineComparison(cpm, activeBase, true);
  });

  // Filter visible tasks according to selected project portfolio scope
  const visibleTasks = useMemo(() => {
    if (selectedProjectId === 'all') return tasks;
    return tasks.filter(t => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  // Total cross-project links connecting tasks across different projects
  const crossProjectCount = useMemo(() => {
    return dependencies.filter(dep => {
      const f = tasks.find(t => t.id === dep.fromTaskId);
      const t = tasks.find(task => task.id === dep.toTaskId);
      return f && t && f.projectId !== t.projectId;
    }).length;
  }, [dependencies, tasks]);

  // What-If Snapshot Backup
  const [whatIfBackup, setWhatIfBackup] = useState<{
    tasks: ProjectTask[];
    dependencies: Dependency[];
  } | null>(null);

  // Interactive Modal States
  const [inspectingTask, setInspectingTask] = useState<ProjectTask | null>(null);
  const [inspectingDependency, setInspectingDependency] = useState<Dependency | null>(null);
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  // Dynamic Ripple Notification Banner
  const [rippleNotice, setRippleNotice] = useState<{
    message: string;
    shiftedCount: number;
    maxDays: number;
  } | null>(null);

  // Active baseline object
  const activeBaseline = useMemo(() => {
    return baselines.find(b => b.id === activeBaselineId) || null;
  }, [baselines, activeBaselineId]);

  // Recalculate resource workloads in real-time
  const workloads = useMemo(() => {
    return calculateResourceWorkloads(tasks, resources, true);
  }, [tasks, resources]);

  // Helper to recompute CPM and Baseline variance across tasks
  const recompute = useCallback(
    (taskList: ProjectTask[], depList: Dependency[] = dependencies) => {
      const cpm = calculateCPM(taskList, depList, true);
      return applyBaselineComparison(cpm, activeBaseline, true);
    },
    [dependencies, activeBaseline]
  );

  // Execute downstream cascade when a task schedule changes
  const applyTaskScheduleChange = useCallback(
    (taskId: string, newStart: string, newDuration: number) => {
      const existingTask = tasks.find(t => t.id === taskId);
      if (!existingTask) return;

      const newEnd = getEndDateFromDuration(newStart, newDuration, true);

      // Mutate the target task
      const updatedList = tasks.map(t =>
        t.id === taskId
          ? {
              ...t,
              startDate: newStart,
              endDate: newEnd,
              durationDays: newDuration,
            }
          : t
      );

      // Cascade downstream
      const ripple = cascadeSchedule(updatedList, dependencies, true, autoCascade);
      const finalTasks = applyBaselineComparison(ripple.updatedTasks, activeBaseline, true);
      setTasks(finalTasks);

      // Show toast if downstream tasks shifted
      if (ripple.shiftedTaskIds.length > 0) {
        const shiftedNames = ripple.shiftedTaskIds
          .map(id => tasks.find(t => t.id === id)?.key)
          .filter(Boolean)
          .join(', ');

        setRippleNotice({
          message: `Cascade engine dynamically shifted ${ripple.shiftedTaskIds.length} downstream task(s): [${shiftedNames}].`,
          shiftedCount: ripple.shiftedTaskIds.length,
          maxDays: ripple.maxShiftDays,
        });

        // Auto-dismiss notice after 6 seconds
        setTimeout(() => setRippleNotice(null), 6000);
      }
    },
    [tasks, dependencies, autoCascade, activeBaseline]
  );

  // Update task details from modal
  const handleSaveTaskDetails = (updatedTask: ProjectTask, newDeps?: Dependency[]) => {
    const depsToUse = newDeps || dependencies;
    if (newDeps) {
      setDependencies(newDeps);
    }

    const updatedList = tasks.map(t => (t.id === updatedTask.id ? updatedTask : t));
    const ripple = cascadeSchedule(updatedList, depsToUse, true, autoCascade);
    const finalTasks = applyBaselineComparison(ripple.updatedTasks, activeBaseline, true);
    setTasks(finalTasks);
    setInspectingTask(null);

    if (ripple.shiftedTaskIds.length > 0) {
      setRippleNotice({
        message: `Updated ${updatedTask.key} and dynamically rippled ${ripple.shiftedTaskIds.length} downstream tasks.`,
        shiftedCount: ripple.shiftedTaskIds.length,
        maxDays: ripple.maxShiftDays,
      });
      setTimeout(() => setRippleNotice(null), 6000);
    }
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    const newTasks = tasks.filter(t => t.id !== taskId);
    const newDeps = dependencies.filter(d => d.fromTaskId !== taskId && d.toTaskId !== taskId);
    setDependencies(newDeps);
    setTasks(recompute(newTasks, newDeps));
    setInspectingTask(null);
  };

  // Create new task
  const handleAddNewTask = () => {
    const targetProjId = selectedProjectId !== 'all' ? selectedProjectId : 'proj-apex';
    const targetProj = projects.find(p => p.id === targetProjId) || projects[0];
    const count = tasks.length + 1;
    const newTask: ProjectTask = {
      id: `task-${Date.now()}`,
      key: `${targetProj.key}-${100 + count}`,
      projectId: targetProjId,
      title: `New ${targetProj.name} Work Item`,
      type: 'task',
      status: 'todo',
      priority: 'medium',
      assigneeId: resources[0]?.id || '',
      startDate: '2026-11-16',
      endDate: '2026-11-20',
      durationDays: 5,
      progress: 0,
      estimatedHours: 40,
      notes: `Created under ${targetProj.name}.`,
    };

    const newTasks = [...tasks, newTask];
    const ripple = cascadeSchedule(newTasks, dependencies, true, autoCascade);
    setTasks(applyBaselineComparison(ripple.updatedTasks, activeBaseline, true));
    setInspectingTask(newTask);
  };

  // Create dependency via drag-and-drop linking on Gantt
  const handleCreateDependency = (fromTaskId: string, toTaskId: string) => {
    // Avoid duplicates or self-links
    if (fromTaskId === toTaskId) return;
    const exists = dependencies.some(d => d.fromTaskId === fromTaskId && d.toTaskId === toTaskId);
    if (exists) return;

    const newDep: Dependency = {
      id: `dep-${Date.now()}`,
      fromTaskId,
      toTaskId,
      type: 'FS',
      lagDays: 0,
    };

    const newDeps = [...dependencies, newDep];
    setDependencies(newDeps);

    // Cascade immediately
    const ripple = cascadeSchedule(tasks, newDeps, true, autoCascade);
    setTasks(applyBaselineComparison(ripple.updatedTasks, activeBaseline, true));

    const fromTask = tasks.find(t => t.id === fromTaskId);
    const toTask = tasks.find(t => t.id === toTaskId);

    setRippleNotice({
      message: `Created link: ${fromTask?.key} ➔ ${toTask?.key} (Finish-to-Start). Downstream schedule recalculated.`,
      shiftedCount: ripple.shiftedTaskIds.length,
      maxDays: ripple.maxShiftDays,
    });
    setTimeout(() => setRippleNotice(null), 6000);
  };

  // Save updated dependency
  const handleSaveDependency = (updated: Dependency) => {
    const newDeps = dependencies.map(d => (d.id === updated.id ? updated : d));
    setDependencies(newDeps);
    const ripple = cascadeSchedule(tasks, newDeps, true, autoCascade);
    setTasks(applyBaselineComparison(ripple.updatedTasks, activeBaseline, true));
    setInspectingDependency(null);

    setRippleNotice({
      message: `Updated dependency constraint (${updated.type}). Downstream cascade recalculated.`,
      shiftedCount: ripple.shiftedTaskIds.length,
      maxDays: ripple.maxShiftDays,
    });
    setTimeout(() => setRippleNotice(null), 6000);
  };

  // Delete dependency
  const handleDeleteDependency = (depId: string) => {
    const newDeps = dependencies.filter(d => d.id !== depId);
    setDependencies(newDeps);
    const ripple = cascadeSchedule(tasks, newDeps, true, autoCascade);
    setTasks(applyBaselineComparison(ripple.updatedTasks, activeBaseline, true));
    setInspectingDependency(null);
  };

  // Auto-level resources (Microsoft Project style)
  const handleAutoLevelResources = () => {
    const result = autoLevelResources(tasks, dependencies, resources, true);
    setTasks(applyBaselineComparison(result.leveledTasks, activeBaseline, true));

    setRippleNotice({
      message: result.message,
      shiftedCount: result.resolvedConflictsCount,
      maxDays: 0,
    });
    setTimeout(() => setRippleNotice(null), 6000);

    if (result.resolvedConflictsCount > 0) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  // Baseline creation
  const handleCreateBaseline = (name: string, description: string) => {
    let latestEnd = '';
    const taskSnapshots: Record<string, any> = {};

    tasks.forEach(t => {
      taskSnapshots[t.id] = {
        startDate: t.startDate,
        endDate: t.endDate,
        durationDays: t.durationDays,
        progress: t.progress,
      };
      if (!latestEnd || t.endDate > latestEnd) {
        latestEnd = t.endDate;
      }
    });

    const newBaseline: BaselineSnapshot = {
      id: `base-${Date.now()}`,
      name,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      description,
      projectEndDate: latestEnd,
      taskSnapshots,
    };

    const newBaselines = [newBaseline, ...baselines];
    setBaselines(newBaselines);
    setActiveBaselineId(newBaseline.id);
    setTasks(applyBaselineComparison(tasks, newBaseline, true));

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // What-If Sandbox Mode Toggle
  const handleToggleWhatIfMode = () => {
    if (!whatIfMode) {
      // Enter What-If Sandbox: take backup
      setWhatIfBackup({
        tasks: JSON.parse(JSON.stringify(tasks)),
        dependencies: JSON.parse(JSON.stringify(dependencies)),
      });
      setWhatIfMode(true);
    } else {
      // Commit what-if
      setWhatIfBackup(null);
      setWhatIfMode(false);
    }
  };

  const handleDiscardWhatIf = () => {
    if (whatIfBackup) {
      setTasks(whatIfBackup.tasks);
      setDependencies(whatIfBackup.dependencies);
      setWhatIfBackup(null);
    }
    setWhatIfMode(false);
  };

  // Export project to JSON
  const handleExportJSON = () => {
    const data = {
      projectName: 'Apex Cloud Platform',
      version: '2.4',
      exportDate: new Date().toISOString(),
      tasks,
      dependencies,
      resources,
      baselines,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-schedule-${formatDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset to default sample template
  const handleResetProject = () => {
    const cpm = calculateCPM(INITIAL_TASKS, INITIAL_DEPENDENCIES, true);
    const withBase = applyBaselineComparison(cpm, INITIAL_BASELINES[0], true);
    setTasks(withBase);
    setDependencies(INITIAL_DEPENDENCIES);
    setResources(INITIAL_RESOURCES);
    setBaselines(INITIAL_BASELINES);
    setActiveBaselineId(INITIAL_BASELINES[0].id);
    setWhatIfMode(false);
    setWhatIfBackup(null);
  };

  // QA Scenario Handlers
  const handleRunCascadeScenario = () => {
    applyTaskScheduleChange('task-4', '2026-11-12', 5);
  };

  const handleRunResourceConflictScenario = () => {
    const updated = tasks.map(t =>
      t.id === 'task-7'
        ? {
            ...t,
            assigneeId: 'res-4',
            startDate: '2026-11-09',
            endDate: '2026-11-13',
            durationDays: 5,
            estimatedHours: 40,
          }
        : t
    );
    setTasks(recompute(updated));
  };

  const handleRunBaselineScenario = () => {
    handleCreateBaseline('QA Re-baseline (Sprint Gate)', 'Verified baseline variance tracking');
  };

  const handleRunWhatIfScenario = () => {
    setWhatIfBackup({
      tasks: JSON.parse(JSON.stringify(tasks)),
      dependencies: JSON.parse(JSON.stringify(dependencies)),
    });
    setWhatIfMode(true);
    applyTaskScheduleChange('task-1', '2026-11-04', 5);
  };

  const handleRunCrossProjectScenario = () => {
    // Shifts APEX-106 (Cloud Gateway) by +3 days
    // Dynamically ripples through dep-cross-1 to MOB-201, MOB-204, and MOB-205!
    applyTaskScheduleChange('task-6', '2026-11-20', 4);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onChangeView={setCurrentView}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onChangeSelectedProject={setSelectedProjectId}
        crossProjectCount={crossProjectCount}
        autoCascade={autoCascade}
        onToggleAutoCascade={() => setAutoCascade(!autoCascade)}
        showCriticalPath={showCriticalPath}
        onToggleCriticalPath={() => setShowCriticalPath(!showCriticalPath)}
        showBaselineComparison={showBaselineComparison}
        onToggleBaselineComparison={() => setShowBaselineComparison(!showBaselineComparison)}
        whatIfMode={whatIfMode}
        onToggleWhatIfMode={handleToggleWhatIfMode}
        onAddNewTask={handleAddNewTask}
        onOpenBaselineModal={() => setIsBaselineModalOpen(true)}
        onResetProject={handleResetProject}
        onExportJSON={handleExportJSON}
        onOpenQAModal={() => setIsQAModalOpen(true)}
        onOpenDocsModal={() => setIsDocsModalOpen(true)}
      />

      {/* What-If Simulation Sandbox Banner */}
      {whatIfMode && whatIfBackup && (
        <WhatIfBanner
          originalFinishDate={
            whatIfBackup.tasks.reduce(
              (max, t) => (t.endDate > max ? t.endDate : max),
              whatIfBackup.tasks[0]?.endDate || ''
            )
          }
          currentFinishDate={
            tasks.reduce((max, t) => (t.endDate > max ? t.endDate : max), tasks[0]?.endDate || '')
          }
          shiftedTasksCount={tasks.filter((t, i) => t.endDate !== whatIfBackup.tasks[i]?.endDate).length}
          onApply={() => {
            setWhatIfBackup(null);
            setWhatIfMode(false);
          }}
          onDiscard={handleDiscardWhatIf}
        />
      )}

      {/* Dynamic Ripple Floating Alert */}
      {rippleNotice && (
        <div className="fixed top-16 right-6 z-50 max-w-md bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 flex items-start gap-3 animate-in slide-in-from-top-4 duration-200">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-blue-300 uppercase tracking-wider text-[10px]">
              Dynamic Ripple Cascade
            </div>
            <div className="text-slate-200 mt-0.5">{rippleNotice.message}</div>
          </div>
          <button
            onClick={() => setRippleNotice(null)}
            className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Project KPI Stats & Health Bar */}
      <ProjectStatsBar
        tasks={tasks}
        activeBaseline={activeBaseline}
        workloads={workloads}
        onAutoLevel={handleAutoLevelResources}
        onOpenBaselineModal={() => setIsBaselineModalOpen(true)}
        showCriticalPath={showCriticalPath}
        onToggleCriticalPath={() => setShowCriticalPath(!showCriticalPath)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {currentView === 'gantt' && (
          <div className="space-y-6">
            <GanttChart
              tasks={visibleTasks}
              dependencies={dependencies}
              resources={resources}
              projects={projects}
              activeBaseline={activeBaseline}
              showCriticalPath={showCriticalPath}
              showBaselineComparison={showBaselineComparison}
              onSelectTask={task => setInspectingTask(task)}
              onUpdateTaskSchedule={applyTaskScheduleChange}
              onOpenDependencyModal={dep => setInspectingDependency(dep)}
              onCreateDependency={handleCreateDependency}
            />

            {/* Split Bottom Preview: Resource Heatmap preview */}
            <div className="mt-6">
              <ResourceHeatmap
                resources={resources}
                tasks={tasks}
                projects={projects}
                workloads={workloads}
                onAutoLevel={handleAutoLevelResources}
                onSelectTask={task => setInspectingTask(task)}
              />
            </div>
          </div>
        )}

        {currentView === 'grid' && (
          <TaskTable
            tasks={visibleTasks}
            dependencies={dependencies}
            resources={resources}
            projects={projects}
            onSelectTask={task => setInspectingTask(task)}
            onUpdateTaskDate={(taskId, start, dur) => applyTaskScheduleChange(taskId, start, dur)}
            onUpdateTaskStatus={(taskId, status) => {
              const updated = tasks.map(t => (t.id === taskId ? { ...t, status } : t));
              setTasks(updated);
            }}
            onUpdateTaskAssignee={(taskId, assigneeId) => {
              const updated = tasks.map(t => (t.id === taskId ? { ...t, assigneeId } : t));
              setTasks(updated);
            }}
            onDeleteTask={handleDeleteTask}
            onAddNewTask={handleAddNewTask}
            onOpenDependencyModal={dep => setInspectingDependency(dep)}
          />
        )}

        {currentView === 'resources' && (
          <ResourceHeatmap
            resources={resources}
            tasks={tasks}
            projects={projects}
            workloads={workloads}
            onAutoLevel={handleAutoLevelResources}
            onSelectTask={task => setInspectingTask(task)}
          />
        )}

        {currentView === 'baselines' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Baseline Comparison & Schedule Slippage</h2>
                <p className="text-xs text-slate-500">
                  Track date variance between committed baselines and current live plan across all portfolio projects.
                </p>
              </div>
              <button
                onClick={() => setIsBaselineModalOpen(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                Manage & Snapshot Baselines
              </button>
            </div>

            <TaskTable
              tasks={visibleTasks}
              dependencies={dependencies}
              resources={resources}
              projects={projects}
              onSelectTask={task => setInspectingTask(task)}
              onUpdateTaskDate={(taskId, start, dur) => applyTaskScheduleChange(taskId, start, dur)}
              onUpdateTaskStatus={(taskId, status) => {
                const updated = tasks.map(t => (t.id === taskId ? { ...t, status } : t));
                setTasks(updated);
              }}
              onUpdateTaskAssignee={(taskId, assigneeId) => {
                const updated = tasks.map(t => (t.id === taskId ? { ...t, assigneeId } : t));
                setTasks(updated);
              }}
              onDeleteTask={handleDeleteTask}
              onAddNewTask={handleAddNewTask}
              onOpenDependencyModal={dep => setInspectingDependency(dep)}
            />
          </div>
        )}
      </main>

      {/* Task Detail Inspector Drawer */}
      {inspectingTask && (
        <TaskDetailModal
          task={inspectingTask}
          allTasks={tasks}
          dependencies={dependencies}
          resources={resources}
          activeBaseline={activeBaseline}
          onClose={() => setInspectingTask(null)}
          onSave={handleSaveTaskDetails}
          onDelete={handleDeleteTask}
          onOpenDependencyModal={dep => {
            setInspectingTask(null);
            setInspectingDependency(dep);
          }}
        />
      )}

      {/* Dependency Link Editor Modal */}
      {inspectingDependency && (
        <DependencyLinkModal
          dependency={inspectingDependency}
          tasks={tasks}
          onClose={() => setInspectingDependency(null)}
          onSave={handleSaveDependency}
          onDelete={handleDeleteDependency}
        />
      )}

      {/* Baseline Manager Modal */}
      {isBaselineModalOpen && (
        <BaselineManagerModal
          baselines={baselines}
          activeBaselineId={activeBaselineId}
          tasks={tasks}
          onClose={() => setIsBaselineModalOpen(false)}
          onSelectActiveBaseline={id => {
            setActiveBaselineId(id);
            const base = baselines.find(b => b.id === id) || null;
            setTasks(applyBaselineComparison(tasks, base, true));
          }}
          onCreateBaseline={handleCreateBaseline}
          onDeleteBaseline={id => {
            const remaining = baselines.filter(b => b.id !== id);
            setBaselines(remaining);
            if (activeBaselineId === id) {
              const nextId = remaining[0]?.id || null;
              setActiveBaselineId(nextId);
            }
          }}
        />
      )}

      {/* QA Scenario Walkthrough Modal */}
      {isQAModalOpen && (
        <QAScenarioModal
          onClose={() => setIsQAModalOpen(false)}
          onRunCascadeScenario={handleRunCascadeScenario}
          onRunResourceConflictScenario={handleRunResourceConflictScenario}
          onRunAutoLevel={handleAutoLevelResources}
          onRunBaselineScenario={handleRunBaselineScenario}
          onRunWhatIfScenario={handleRunWhatIfScenario}
          onRunCrossProjectCascadeScenario={handleRunCrossProjectScenario}
          onResetToDefault={handleResetProject}
        />
      )}

      {/* Documentation & Notion Export Modal */}
      {isDocsModalOpen && (
        <DocumentationModal onClose={() => setIsDocsModalOpen(false)} />
      )}
    </div>
  );
}
