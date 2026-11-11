export type IssueType = 'epic' | 'story' | 'task' | 'bug' | 'milestone';
export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
export type Priority = 'lowest' | 'low' | 'medium' | 'high' | 'highest';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';
// FS = Finish to Start (default: B starts when A finishes)
// SS = Start to Start (B starts when A starts)
// FF = Finish to Finish (B finishes when A finishes)
// SF = Start to Finish (B finishes when A starts)

export interface Dependency {
  id: string;
  fromTaskId: string; // Predecessor
  toTaskId: string;   // Successor
  type: DependencyType;
  lagDays: number;    // positive for lag, negative for lead time
}

export interface Resource {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  color: string;
  capacityHoursPerDay: number; // usually 8
}

export interface TaskBaseline {
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;   // ISO date YYYY-MM-DD
  durationDays: number;
  progress: number;
}

export interface BaselineSnapshot {
  id: string;
  name: string;
  createdAt: string;
  description: string;
  taskSnapshots: Record<string, TaskBaseline>;
  projectEndDate: string;
}

export interface ProjectEntity {
  id: string;
  key: string;            // 'APEX', 'MOB', 'SEC'
  name: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  leadId: string;
}

export interface ProjectTask {
  id: string;
  key: string;            // e.g. "APEX-101"
  projectId: string;      // ID of parent project
  title: string;
  type: IssueType;
  status: IssueStatus;
  priority: Priority;
  assigneeId: string;     // Resource ID
  parentId?: string;      // Epic or parent task ID
  startDate: string;      // ISO YYYY-MM-DD
  endDate: string;        // ISO YYYY-MM-DD
  durationDays: number;   // working days or calendar days
  progress: number;       // 0 - 100 %
  storyPoints?: number;
  estimatedHours: number;
  notes?: string;
  
  // Calculated CPM & Scheduling fields
  earlyStart?: string;
  earlyFinish?: string;
  lateStart?: string;
  lateFinish?: string;
  totalFloatDays?: number; // Total slack
  isCritical?: boolean;    // on critical path if slack <= 0
  
  // Baseline comparison
  baselineVarianceDays?: number; // difference in finish date compared to active baseline
}

export interface ProjectSettings {
  name: string;
  key: string;
  autoCascade: boolean;          // automatically shift downstream tasks on change
  enforceWorkdaysOnly: boolean;  // skip weekends (Sat/Sun)
  workingHoursPerDay: number;    // default 8
  zoomLevel: 'day' | 'week' | 'month' | 'quarter';
  showCriticalPath: boolean;
  showBaselineComparison: boolean;
  activeBaselineId: string | null;
  whatIfMode: boolean;           // simulation sandbox mode
}

export interface WorkloadDay {
  date: string; // YYYY-MM-DD
  allocatedHours: number;
  capacityHours: number;
  overallocated: boolean;
  taskIds: string[];
}

export interface ResourceWorkload {
  resourceId: string;
  resource: Resource;
  days: Record<string, WorkloadDay>;
  peakAllocationPercent: number;
  totalOverallocatedDays: number;
}
