import { ProjectTask, Dependency, Resource, ResourceWorkload, WorkloadDay, BaselineSnapshot } from '../types/project';

// Date utility helpers (normalized to YYYY-MM-DD)
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Add calendar or working days to a date string
 */
export function addDays(dateStr: string, days: number, workdaysOnly: boolean = true): string {
  if (days === 0) return dateStr;
  let current = parseDate(dateStr);
  let step = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);

  while (remaining > 0) {
    current.setUTCDate(current.getUTCDate() + step);
    if (!workdaysOnly || !isWeekend(current)) {
      remaining--;
    }
  }

  return formatDate(current);
}

/**
 * Calculate working days duration between two dates (inclusive)
 */
export function calculateDurationDays(startDateStr: string, endDateStr: string, workdaysOnly: boolean = true): number {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);

  if (start > end) return 1;

  let count = 0;
  let current = new Date(start.getTime());

  while (current <= end) {
    if (!workdaysOnly || !isWeekend(current)) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return Math.max(1, count);
}

/**
 * Calculate date difference in working days (end - start)
 */
export function getDaysDifference(startDateStr: string, endDateStr: string, workdaysOnly: boolean = true): number {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  const isNegative = start > end;

  let [from, to] = isNegative ? [end, start] : [start, end];
  let count = 0;
  let current = new Date(from.getTime());

  while (current < to) {
    if (!workdaysOnly || !isWeekend(current)) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return isNegative ? -count : count;
}

/**
 * Compute end date from start date and duration (working days inclusive)
 */
export function getEndDateFromDuration(startDateStr: string, durationDays: number, workdaysOnly: boolean = true): string {
  if (durationDays <= 1) {
    let start = parseDate(startDateStr);
    if (workdaysOnly && isWeekend(start)) {
      // align to next workday
      return addDays(startDateStr, 0, workdaysOnly);
    }
    return startDateStr;
  }
  return addDays(startDateStr, durationDays - 1, workdaysOnly);
}

/**
 * Calculate minimum allowed start date for a task based on a predecessor dependency
 */
export function getPredecessorConstraint(
  predTask: ProjectTask,
  dep: Dependency,
  workdaysOnly: boolean = true
): { minStartDate?: string; minEndDate?: string } {
  const lag = dep.lagDays || 0;

  switch (dep.type) {
    case 'FS': {
      // Finish to Start: Successor starts after Predecessor finishes (+ lag)
      // If pred finishes on Date P, with 0 lag, succ starts next working day (P + 1)
      const nextDay = addDays(predTask.endDate, 1 + lag, workdaysOnly);
      return { minStartDate: nextDay };
    }
    case 'SS': {
      // Start to Start: Successor starts after Predecessor starts (+ lag)
      const targetStart = addDays(predTask.startDate, lag, workdaysOnly);
      return { minStartDate: targetStart };
    }
    case 'FF': {
      // Finish to Finish: Successor finishes after Predecessor finishes (+ lag)
      const targetEnd = addDays(predTask.endDate, lag, workdaysOnly);
      return { minEndDate: targetEnd };
    }
    case 'SF': {
      // Start to Finish: Successor finishes after Predecessor starts (+ lag)
      const targetEnd = addDays(predTask.startDate, lag, workdaysOnly);
      return { minEndDate: targetEnd };
    }
    default:
      return {};
  }
}

/**
 * Ripple calculation: Shifts all downstream tasks when any task moves or changes duration
 */
export interface RippleResult {
  updatedTasks: ProjectTask[];
  shiftedTaskIds: string[];
  maxShiftDays: number;
}

export function cascadeSchedule(
  tasks: ProjectTask[],
  dependencies: Dependency[],
  workdaysOnly: boolean = true,
  autoCascade: boolean = true
): RippleResult {
  if (!autoCascade) {
    // If autoCascade is off, only recompute CPM and float
    const cpmTasks = calculateCPM(tasks, dependencies, workdaysOnly);
    return { updatedTasks: cpmTasks, shiftedTaskIds: [], maxShiftDays: 0 };
  }

  const taskMap = new Map<string, ProjectTask>();
  tasks.forEach(t => taskMap.set(t.id, { ...t }));

  // Build adjacency list for predecessors & successors
  const successorsMap = new Map<string, Dependency[]>();
  const predecessorsMap = new Map<string, Dependency[]>();

  dependencies.forEach(dep => {
    if (!successorsMap.has(dep.fromTaskId)) successorsMap.set(dep.fromTaskId, []);
    successorsMap.get(dep.fromTaskId)!.push(dep);

    if (!predecessorsMap.has(dep.toTaskId)) predecessorsMap.set(dep.toTaskId, []);
    predecessorsMap.get(dep.toTaskId)!.push(dep);
  });

  // Topological sorting (Kahn's algorithm) to process tasks in correct dependency order
  const inDegree = new Map<string, number>();
  tasks.forEach(t => inDegree.set(t.id, 0));

  dependencies.forEach(dep => {
    if (inDegree.has(dep.toTaskId)) {
      inDegree.set(dep.toTaskId, (inDegree.get(dep.toTaskId) || 0) + 1);
    }
  });

  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const orderedTaskIds: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    orderedTaskIds.push(id);

    const succs = successorsMap.get(id) || [];
    succs.forEach(dep => {
      const curDeg = (inDegree.get(dep.toTaskId) || 1) - 1;
      inDegree.set(dep.toTaskId, curDeg);
      if (curDeg === 0) {
        queue.push(dep.toTaskId);
      }
    });
  }

  // If there's a cycle, append any remaining tasks
  if (orderedTaskIds.length < tasks.length) {
    tasks.forEach(t => {
      if (!orderedTaskIds.includes(t.id)) {
        orderedTaskIds.push(t.id);
      }
    });
  }

  const shiftedTaskIds = new Set<string>();
  let maxShiftDays = 0;

  // Process tasks in topological order
  for (const taskId of orderedTaskIds) {
    const task = taskMap.get(taskId);
    if (!task) continue;

    const preds = predecessorsMap.get(taskId) || [];
    if (preds.length === 0) continue;

    let requiredMinStart = task.startDate;
    let requiredMinEnd = task.endDate;
    let hasStrictEndConstraint = false;

    for (const dep of preds) {
      const predTask = taskMap.get(dep.fromTaskId);
      if (!predTask) continue;

      const constraint = getPredecessorConstraint(predTask, dep, workdaysOnly);
      if (constraint.minStartDate) {
        if (constraint.minStartDate > requiredMinStart) {
          requiredMinStart = constraint.minStartDate;
        }
      }
      if (constraint.minEndDate) {
        hasStrictEndConstraint = true;
        if (constraint.minEndDate > requiredMinEnd) {
          requiredMinEnd = constraint.minEndDate;
        }
      }
    }

    let newStart = task.startDate;
    let newEnd = task.endDate;

    if (requiredMinStart > task.startDate) {
      const shift = getDaysDifference(task.startDate, requiredMinStart, workdaysOnly);
      if (shift > 0) {
        newStart = requiredMinStart;
        newEnd = getEndDateFromDuration(newStart, task.durationDays, workdaysOnly);
        shiftedTaskIds.add(taskId);
        maxShiftDays = Math.max(maxShiftDays, shift);
      }
    }

    if (hasStrictEndConstraint && requiredMinEnd > newEnd) {
      // Need to adjust end date, keeping duration or pushing start
      newEnd = requiredMinEnd;
      // Start is pushed to satisfy duration
      newStart = addDays(newEnd, -(task.durationDays - 1), workdaysOnly);
      shiftedTaskIds.add(taskId);
    }

    task.startDate = newStart;
    task.endDate = newEnd;
    taskMap.set(taskId, task);
  }

  // Calculate CPM (Critical Path Method) and Float on final positions
  const updatedTaskList = Array.from(taskMap.values());
  const finalTasks = calculateCPM(updatedTaskList, dependencies, workdaysOnly);

  return {
    updatedTasks: finalTasks,
    shiftedTaskIds: Array.from(shiftedTaskIds),
    maxShiftDays,
  };
}

/**
 * Critical Path Method (CPM) Forward & Backward pass to calculate:
 * - Early Start (ES) & Early Finish (EF)
 * - Late Start (LS) & Late Finish (LF)
 * - Total Float / Slack (LF - EF)
 * - isCritical (Total Float === 0)
 */
export function calculateCPM(
  tasks: ProjectTask[],
  dependencies: Dependency[],
  workdaysOnly: boolean = true
): ProjectTask[] {
  if (tasks.length === 0) return [];

  const taskMap = new Map<string, ProjectTask>();
  tasks.forEach(t => taskMap.set(t.id, { ...t }));

  // Forward Pass: Calculate Early Start and Early Finish
  // 1. Identify overall project start
  let projectLatestFinish = tasks[0].endDate;
  for (const t of tasks) {
    if (t.endDate > projectLatestFinish) {
      projectLatestFinish = t.endDate;
    }
  }

  const predecessorsMap = new Map<string, Dependency[]>();
  const successorsMap = new Map<string, Dependency[]>();

  dependencies.forEach(d => {
    if (!predecessorsMap.has(d.toTaskId)) predecessorsMap.set(d.toTaskId, []);
    predecessorsMap.get(d.toTaskId)!.push(d);

    if (!successorsMap.has(d.fromTaskId)) successorsMap.set(d.fromTaskId, []);
    successorsMap.get(d.fromTaskId)!.push(d);
  });

  // Calculate Early Start/Finish (ES / EF)
  tasks.forEach(task => {
    const t = taskMap.get(task.id)!;
    t.earlyStart = t.startDate;
    t.earlyFinish = t.endDate;
  });

  // Backward Pass: Calculate Late Finish (LF) and Late Start (LS)
  // End nodes have LF = projectLatestFinish
  tasks.forEach(task => {
    const t = taskMap.get(task.id)!;
    t.lateFinish = projectLatestFinish;
    t.lateStart = addDays(projectLatestFinish, -(t.durationDays - 1), workdaysOnly);
  });

  // Backward pass in reverse dependency order
  // Repeat relaxation a few times to propagate across graph
  for (let iter = 0; iter < tasks.length + 1; iter++) {
    for (const task of tasks) {
      const t = taskMap.get(task.id)!;
      const succs = successorsMap.get(task.id) || [];

      if (succs.length > 0) {
        let minAllowableLF = projectLatestFinish;

        for (const dep of succs) {
          const succTask = taskMap.get(dep.toTaskId);
          if (!succTask || !succTask.lateStart || !succTask.lateFinish) continue;

          // For FS dependency: predecessor must finish before successor starts
          // pred.LF <= succ.LS - 1 - lag
          const lag = dep.lagDays || 0;
          let allowableLF = '';

          switch (dep.type) {
            case 'FS':
              allowableLF = addDays(succTask.lateStart, -(1 + lag), workdaysOnly);
              break;
            case 'SS':
              // pred.LS <= succ.LS - lag => pred.LF = pred.LS + duration - 1
              const maxLS = addDays(succTask.lateStart, -lag, workdaysOnly);
              allowableLF = getEndDateFromDuration(maxLS, t.durationDays, workdaysOnly);
              break;
            case 'FF':
              allowableLF = addDays(succTask.lateFinish, -lag, workdaysOnly);
              break;
            case 'SF':
              const maxLS_SF = addDays(succTask.lateFinish, -lag, workdaysOnly);
              allowableLF = getEndDateFromDuration(maxLS_SF, t.durationDays, workdaysOnly);
              break;
          }

          if (allowableLF && allowableLF < minAllowableLF) {
            minAllowableLF = allowableLF;
          }
        }

        t.lateFinish = minAllowableLF;
        t.lateStart = addDays(minAllowableLF, -(t.durationDays - 1), workdaysOnly);
      }
    }
  }

  // Calculate Slack / Float and Critical Path flag
  tasks.forEach(task => {
    const t = taskMap.get(task.id)!;
    // Total float is the difference between late finish and current end date
    const float = getDaysDifference(t.endDate, t.lateFinish || t.endDate, workdaysOnly);
    t.totalFloatDays = Math.max(0, float);
    // Task is critical if it has 0 slack
    t.isCritical = t.totalFloatDays === 0;
  });

  return Array.from(taskMap.values());
}

/**
 * Apply baseline comparisons: calculates variance in days for each task
 */
export function applyBaselineComparison(
  tasks: ProjectTask[],
  baseline: BaselineSnapshot | null,
  workdaysOnly: boolean = true
): ProjectTask[] {
  if (!baseline) {
    return tasks.map(t => ({ ...t, baselineVarianceDays: 0 }));
  }

  return tasks.map(task => {
    const base = baseline.taskSnapshots[task.id];
    if (!base) {
      return { ...task, baselineVarianceDays: 0 };
    }

    // Variance: current end date minus baseline end date
    // Positive variance means slippage / delay
    const variance = getDaysDifference(base.endDate, task.endDate, workdaysOnly);
    return {
      ...task,
      baselineVarianceDays: variance,
    };
  });
}

/**
 * Calculate resource allocation and over-allocation across timeline
 */
export function calculateResourceWorkloads(
  tasks: ProjectTask[],
  resources: Resource[],
  workdaysOnly: boolean = true
): Record<string, ResourceWorkload> {
  const workloads: Record<string, ResourceWorkload> = {};

  resources.forEach(r => {
    workloads[r.id] = {
      resourceId: r.id,
      resource: r,
      days: {},
      peakAllocationPercent: 0,
      totalOverallocatedDays: 0,
    };
  });

  tasks.forEach(task => {
    if (!task.assigneeId || !workloads[task.assigneeId]) return;
    const workload = workloads[task.assigneeId];
    const capacity = workload.resource.capacityHoursPerDay || 8;

    // Distribute hours evenly across duration working days
    const totalHours = task.estimatedHours || task.durationDays * 8;
    const dailyHours = totalHours / Math.max(1, task.durationDays);

    let current = parseDate(task.startDate);
    const end = parseDate(task.endDate);

    while (current <= end) {
      if (!workdaysOnly || !isWeekend(current)) {
        const dateKey = formatDate(current);
        if (!workload.days[dateKey]) {
          workload.days[dateKey] = {
            date: dateKey,
            allocatedHours: 0,
            capacityHours: capacity,
            overallocated: false,
            taskIds: [],
          };
        }

        workload.days[dateKey].allocatedHours += Math.round(dailyHours * 10) / 10;
        workload.days[dateKey].taskIds.push(task.id);
        if (workload.days[dateKey].allocatedHours > capacity) {
          workload.days[dateKey].overallocated = true;
        }
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
  });

  // Calculate summary stats per resource
  Object.values(workloads).forEach(w => {
    const capacity = w.resource.capacityHoursPerDay || 8;
    let maxHours = 0;
    let overDays = 0;

    Object.values(w.days).forEach(day => {
      if (day.allocatedHours > maxHours) maxHours = day.allocatedHours;
      if (day.overallocated) overDays++;
    });

    w.peakAllocationPercent = Math.round((maxHours / capacity) * 100);
    w.totalOverallocatedDays = overDays;
  });

  return workloads;
}

/**
 * Microsoft Project-style Resource Leveling:
 * Automatically resolves over-allocations by shifting non-critical tasks that have available float
 */
export function autoLevelResources(
  tasks: ProjectTask[],
  dependencies: Dependency[],
  resources: Resource[],
  workdaysOnly: boolean = true
): { leveledTasks: ProjectTask[]; resolvedConflictsCount: number; message: string } {
  // First, calculate CPM to know floats
  let currentTasks = calculateCPM(tasks, dependencies, workdaysOnly);
  let resolvedConflicts = 0;

  // Clone tasks
  const taskMap = new Map<string, ProjectTask>();
  currentTasks.forEach(t => taskMap.set(t.id, { ...t }));

  // Find over-allocations
  const workloads = calculateResourceWorkloads(Array.from(taskMap.values()), resources, workdaysOnly);

  // Group over-allocated dates by resource
  for (const resourceId of Object.keys(workloads)) {
    const w = workloads[resourceId];
    if (w.totalOverallocatedDays === 0) continue;

    // Sort dates chronologically
    const sortedDates = Object.keys(w.days).sort();

    for (const dateStr of sortedDates) {
      const day = w.days[dateStr];
      if (!day || !day.overallocated || day.taskIds.length <= 1) continue;

      // Identify conflicting tasks on this day
      const conflictingTasks = day.taskIds
        .map(id => taskMap.get(id)!)
        .filter(Boolean)
        // Sort non-critical tasks first, or tasks with higher float, or lower priority
        .sort((a, b) => {
          if (a.isCritical && !b.isCritical) return 1;
          if (!a.isCritical && b.isCritical) return -1;
          return (b.totalFloatDays || 0) - (a.totalFloatDays || 0);
        });

      // Shift the lowest priority / non-critical task by 1 or more working days
      const taskToShift = conflictingTasks[0];
      if (taskToShift && !taskToShift.isCritical && (taskToShift.totalFloatDays || 0) > 0) {
        const newStartDate = addDays(taskToShift.startDate, 1, workdaysOnly);
        const newEndDate = getEndDateFromDuration(newStartDate, taskToShift.durationDays, workdaysOnly);

        taskToShift.startDate = newStartDate;
        taskToShift.endDate = newEndDate;
        taskMap.set(taskToShift.id, taskToShift);
        resolvedConflicts++;

        // Re-cascade downstream
        const ripple = cascadeSchedule(Array.from(taskMap.values()), dependencies, workdaysOnly, true);
        ripple.updatedTasks.forEach(t => taskMap.set(t.id, t));
      }
    }
  }

  const finalList = Array.from(taskMap.values());
  const finalTasks = calculateCPM(finalList, dependencies, workdaysOnly);

  return {
    leveledTasks: finalTasks,
    resolvedConflictsCount: resolvedConflicts,
    message: resolvedConflicts > 0
      ? `Successfully auto-leveled ${resolvedConflicts} task schedule conflict(s) using available float.`
      : `No non-critical float available to auto-level remaining conflicts without delaying project milestone.`,
  };
}
