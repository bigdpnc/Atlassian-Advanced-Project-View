# Atlassian Project Engine — Technical Architecture & Operating Manual
*A Jira-Style Dynamic Scheduling Engine with Microsoft Project-Grade Cascading, Baselines & Resource Leveling*

---

## 1. Executive Summary

Traditional Jira dashboards and roadmaps provide agile tracking (Epics, Stories, Sprints, Kanban), but lack the deterministic dynamic scheduling engine of Microsoft Project. When timelines slip or tasks are rescheduled in Jira, downstream dependencies do not automatically recalculate, and resource over-allocations must be manually identified and resolved.

This application unites both paradigms:
1. **Atlassian Jira Interface**: Familiar work item hierarchy (`APEX-101`), Issue Types (Epics, Stories, Tasks, Bugs, Milestones), Assignee avatars, Status workflows, and WBS grid.
2. **Microsoft Project Scheduling Engine**:
   - **Precedence Diagramming Method (PDM)**: Finish-to-Start (FS), Start-to-Start (SS), Finish-to-Finish (FF), Start-to-Finish (SF) with lead/lag days.
   - **Dynamic Downstream Ripple**: Shifting any task instantly recalculates all downstream deadlines in topological order.
   - **Critical Path Method (CPM)**: Dual-pass (forward & backward) calculating Early Start/Finish, Late Start/Finish, and Total Slack/Float.
   - **Baseline Comparison & Slippage**: Snapshot baselines, ghost bars on Gantt, and variance analytics (`+X days delay`).
   - **Resource Workload & Leveling**: Real-time capacity heatmaps (>100% overload detection) and 1-click float-based auto-leveling.
   - **What-If Simulation Sandbox**: Test hypothetical delays in memory before committing to the live plan.

---

## 2. Scheduling Engine Architecture (`/src/engine/scheduler.ts`)

### 2.1 Precedence Diagramming Method (PDM)
Each dependency link $D = (A \to B, \text{type}, \text{lag})$ imposes a temporal constraint:

| Dependency Type | Formula / Constraint | Description |
| :--- | :--- | :--- |
| **Finish-to-Start (FS)** | $\text{Start}_B \ge \text{End}_A + 1 + \text{lag}$ | Task $B$ cannot start until Task $A$ finishes. |
| **Start-to-Start (SS)** | $\text{Start}_B \ge \text{Start}_A + \text{lag}$ | Task $B$ cannot start until Task $A$ starts. |
| **Finish-to-Finish (FF)** | $\text{End}_B \ge \text{End}_A + \text{lag}$ | Task $B$ cannot finish until Task $A$ finishes. |
| **Start-to-Finish (SF)** | $\text{End}_B \ge \text{Start}_A + \text{lag}$ | Task $B$ cannot finish until Task $A$ starts. |

*Note: All date calculations strictly observe working days (skipping Saturday and Sunday) using calendar-aware date incrementation.*

### 2.2 Topological Cascade & Ripple Engine
When any task is modified:
1. **Dependency Graph Construction**: Builds directed adjacency lists for predecessors and successors.
2. **Kahn's Topological Sort**: Processes tasks in strict dependency order, guaranteeing that predecessors are finalized before their successors are evaluated.
3. **Constraint Propagation**: For each task $T$, computes:
   $$\text{Earliest Start} = \max_{p \in \text{Predecessors}} (\text{Constraint}(p, T))$$
4. **Downstream Ripple**: If $\text{Earliest Start} > \text{Current Start}_T$, $T$ is shifted forward, and its new end date is recalculated from its working-day duration.
5. **Diff Reporting**: Tracks all shifted task keys and calculates the maximum project finish slip for instant user feedback.

### 2.3 Critical Path Method (CPM)
- **Forward Pass**:
  - $ES_i = \max_{j \in \text{Pred}(i)} (EF_j + 1 + \text{lag})$
  - $EF_i = ES_i + \text{Duration}_i - 1$
- **Backward Pass**:
  - $LF_{\text{terminal}} = \max (\text{Project Finish})$
  - $LF_i = \min_{k \in \text{Succ}(i)} (LS_k - 1 - \text{lag})$
  - $LS_i = LF_i - \text{Duration}_i + 1$
- **Total Float (Slack)**:
  $$\text{Slack}_i = LF_i - EF_i = LS_i - ES_i$$
- **Critical Path Identification**: Tasks where $\text{Slack}_i = 0$ are marked with `isCritical: true` and illuminated with a pulsing crimson glow.

---

## 3. Baseline Comparison & Variance Tracking

1. **Snapshot Freezing**: Captures start date, end date, duration, and progress for every work item at milestone sign-off.
2. **Ghost Overlays**: In the Gantt view, dashed ghost bars render underneath current plan bars.
3. **Variance Formula**:
   $$\text{Variance (Days)} = \text{Current End Date} - \text{Baseline End Date}$$
   - Positive variance ($> 0$): **Delay / Slippage** (rendered in rose red).
   - Negative variance ($< 0$): **Ahead of Schedule** (rendered in emerald green).
   - Zero variance ($= 0$): **On Plan** (rendered in slate grey).

---

## 4. Resource Capacity & Auto-Leveling Algorithm

### 4.1 Daily Allocation Distribution
For each task assigned to a team member:
$$\text{Daily Hours} = \frac{\text{Estimated Hours}}{\max(1, \text{Duration Days})}$$
Hours are aggregated across all active tasks for each calendar day:
$$\text{Total Hours}(R, d) = \sum_{T \in \text{Active}(R, d)} \text{Daily Hours}(T)$$
If $\text{Total Hours}(R, d) > \text{Capacity}(R)$ (typically 8h/day), the cell triggers an over-allocation alert.

### 4.2 Float-Based Auto-Leveling
When the user triggers **Auto-Level Resources**:
1. Scans the timeline for dates where $\text{Total Hours} > 8\text{h}$.
2. Inspects conflicting overlapping tasks.
3. Identifies non-critical tasks with available **Float (Slack $> 0$)**.
4. Shifts the lower-priority, non-critical task by working day increments within its float window.
5. Re-executes the downstream cascade to maintain dependency integrity without extending the committed project deadline!

---

## 5. What-If Simulation Sandbox

- **Isolated Memory Fork**: Creates a deep clone of the project graph when enabled.
- **Hypothetical Projections**: Allows project managers to test vendor delays, scope expansion, or resource reallocations.
- **Delta Diff Banner**: Compares simulated project finish date vs original target with a one-click **Commit** or **Discard**.

---

## 6. Notion Import Instructions

To import this technical documentation directly into your Notion workspace:
1. In the app, open the **Docs & Notion Sync** modal and click **Copy to Notion**.
2. Open any Notion page and press `Ctrl+V` (or `Cmd+V`). Notion will automatically parse headings, callouts, and markdown tables.
3. Alternatively, click **Download Markdown (.md)** in the modal, then in Notion click `...` $\to$ `Import` $\to$ `Markdown & CSV`.
