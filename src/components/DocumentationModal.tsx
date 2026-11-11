import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Download,
  ExternalLink,
  X,
  Cpu,
  Layers,
  GitCommit,
  Users,
  FlaskConical,
  Sparkles,
} from 'lucide-react';

interface DocumentationModalProps {
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'engine' | 'notion'>('overview');

  const documentationMarkdown = `# Atlassian Project Engine — Technical Architecture & Operating Manual
A Jira-Style Dynamic Scheduling Engine with Microsoft Project-Grade Cascading, Baselines & Resource Leveling

## 1. Executive Summary
Traditional Jira dashboards provide agile work item tracking (Epics, Stories, Sprints), but lack the deterministic dynamic scheduling engine of Microsoft Project. When timelines slip in Jira, downstream dependencies do not automatically recalculate, and resource over-allocations must be manually managed.

This application unites both paradigms:
- **Atlassian Jira Interface**: Familiar work item keys (APEX-101), Issue Types (Epics, Stories, Tasks, Bugs, Milestones), Assignee avatars, Status workflows, and WBS grid.
- **Microsoft Project Scheduling Engine**:
  - Precedence Diagramming Method (PDM): FS, SS, FF, SF links with lag/lead days.
  - Dynamic Downstream Ripple: Shifting any task cascades downstream deadlines in topological order.
  - Critical Path Method (CPM): Dual-pass (forward & backward) calculating Early Start/Finish, Late Start/Finish, and Total Slack.
  - Baseline Comparison: Snapshot baselines, ghost bars on Gantt, and variance analytics (+X days delay).
  - Resource Workload & Leveling: Real-time capacity heatmaps and 1-click float-based auto-leveling.
  - What-If Simulation Sandbox: Test hypothetical delays in memory before committing.

## 2. PDM & Downstream Cascade Math
### 2.1 Dependency Types
- Finish-to-Start (FS): Start_B >= End_A + 1 + lag
- Start-to-Start (SS): Start_B >= Start_A + lag
- Finish-to-Finish (FF): End_B >= End_A + lag
- Start-to-Finish (SF): End_B >= Start_A + lag

### 2.2 Kahn's Topological Ordering
All tasks are sorted topologically based on directed graph edges. When task A is shifted, every successor B is evaluated against its predecessor constraints. If required Start_B > current Start_B, task B is shifted forward, preserving its duration in working days.

## 3. Critical Path Method (CPM)
- Forward Pass: ES_i = max(EF_pred + 1 + lag), EF_i = ES_i + Duration - 1
- Backward Pass: LF_terminal = max(Project Finish), LF_i = min(LS_succ - 1 - lag)
- Slack / Float: Total Float = LF_i - EF_i
- Critical Tasks: Slack = 0 (highlighted with crimson glow and pulse)

## 4. Resource Capacity & Auto-Leveling
- Daily Hours: Task Estimated Hours / Task Duration Days
- Over-allocation Alert: Daily Hours > 8h/day (100% capacity)
- Leveling Heuristic: Shifts non-critical tasks with available float (Slack > 0) to resolve bottlenecks without extending the committed project milestone.

## 5. Notion Integration Guide
1. Copy this markdown via the 'Copy to Notion' button.
2. Open any page in Notion and press Paste (Ctrl+V / Cmd+V). Notion parses markdown into formatted blocks.
3. Alternatively, use 'Download Markdown (.md)' and in Notion click Settings & Members > Import > Markdown & CSV.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(documentationMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    const blob = new Blob([documentationMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Atlassian-Project-Engine-Architecture.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                System Documentation & Architecture
                <span className="text-[10px] font-mono uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  Notion Ready
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Detailed design specification, mathematical scheduling models, and Notion export.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard!' : 'Copy to Notion'}
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Download Markdown file"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-4 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Architecture Overview
          </button>
          <button
            onClick={() => setActiveTab('engine')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'engine'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Scheduling Engine Math (PDM + CPM)
          </button>
          <button
            onClick={() => setActiveTab('notion')}
            className={`py-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'notion'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Store in Notion Guide
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 text-xs leading-relaxed">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200">
                <h3 className="text-sm font-bold text-blue-950 mb-1">
                  Why Jira + Microsoft Project Hybrid?
                </h3>
                <p className="text-blue-900">
                  Atlassian Jira is the gold standard for software agile tracking, but lacks
                  deterministic precedence cascading and dynamic resource leveling. When a backend
                  epic slips 3 days in standard Jira, downstream QA and deployment dates do not
                  shift automatically. This engine solves that by embedding Microsoft Project’s
                  Precedence Diagramming Method (PDM), forward/backward CPM float analysis, and
                  workload auto-leveling into a native Jira experience.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-blue-600" /> Atlassian Jira Layer
                  </div>
                  <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                    <li>Work Breakdown Structure (WBS) with Keys (<code className="bg-slate-200 px-1 rounded font-mono">APEX-101</code>)</li>
                    <li>Issue Types: Epics, Stories, Tasks, Bugs, Milestones</li>
                    <li>Team Resource Avatars, Capacities & Hourly Rates</li>
                    <li>Status Workflows: Backlog, To Do, In Progress, In Review, Done</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-purple-600" /> MS Project Engine Layer
                  </div>
                  <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                    <li>FS, SS, FF, SF relationships with Lead/Lag days</li>
                    <li>Topological Kahn cascade downstream ripple</li>
                    <li>Critical Path (Slack = 0) with forward/backward passes</li>
                    <li>Baseline Snapshots with ghost Gantt overlay & slippage badges</li>
                    <li>Resource capacity heatmap with auto-leveling</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'engine' && (
            <div className="space-y-5">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">
                  Precedence Diagramming Method (PDM) Constraint Formulas
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <tr>
                      <th className="p-2.5">Relationship</th>
                      <th className="p-2.5">Mathematical Rule</th>
                      <th className="p-2.5">Real-World Scenario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2.5 font-bold font-mono text-blue-700">FS (Finish-to-Start)</td>
                      <td className="p-2.5 font-mono">Start_B ≥ End_A + 1 + Lag</td>
                      <td className="p-2.5 text-slate-600">QA testing cannot begin until frontend coding finishes.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold font-mono text-emerald-700">SS (Start-to-Start)</td>
                      <td className="p-2.5 font-mono">Start_B ≥ Start_A + Lag</td>
                      <td className="p-2.5 text-slate-600">Documentation begins 1 day after feature development starts.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold font-mono text-purple-700">FF (Finish-to-Finish)</td>
                      <td className="p-2.5 font-mono">End_B ≥ End_A + Lag</td>
                      <td className="p-2.5 text-slate-600">Chaos testing must finish simultaneously with E2E regression.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold font-mono text-amber-700">SF (Start-to-Finish)</td>
                      <td className="p-2.5 font-mono">End_B ≥ Start_A + Lag</td>
                      <td className="p-2.5 text-slate-600">Legacy cluster shutdown cannot complete until new cluster boots.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 text-sm">
                  Critical Path Method (CPM) Float / Slack
                </div>
                <p className="text-slate-600">
                  Total Float represents how long an activity can be delayed without delaying the
                  project completion date. Tasks with <code>Total Float = 0</code> form the Critical
                  Path. Any delay on a critical task translates 1:1 into a delayed project finish.
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px]">
                  Total Float = Late Finish (LF) - Early Finish (EF) = Late Start (LS) - Early Start (ES)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notion' && (
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-2">
                <div className="font-bold text-purple-950 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                  Storing this Documentation in your Notion Account
                </div>
                <p className="text-purple-900">
                  Because this app operates inside a secure environment, you can export and paste
                  this documentation directly into Notion in 10 seconds:
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-900">Click "Copy to Notion"</strong>
                    <p className="text-slate-600 mt-0.5">
                      The top button copies clean Notion-optimized Markdown blocks (formatted
                      tables, headers, formulas, and badges) directly to your clipboard.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-900">Paste in Notion (Cmd+V or Ctrl+V)</strong>
                    <p className="text-slate-600 mt-0.5">
                      Open or create any Notion page and press Paste. Notion will instantly convert
                      all markdown tables, code formulas, callout blocks, and headers into native
                      Notion blocks!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-900">Alternative: Direct File Import</strong>
                    <p className="text-slate-600 mt-0.5">
                      Click the Download button to save{' '}
                      <code className="bg-slate-100 px-1 rounded font-mono">Atlassian-Project-Engine-Architecture.md</code>.
                      In Notion, click <code className="bg-slate-100 px-1 rounded font-mono">...</code> at top right &gt;{' '}
                      <code className="bg-slate-100 px-1 rounded font-mono">Import</code> &gt;{' '}
                      <code className="bg-slate-100 px-1 rounded font-mono">Markdown & CSV</code>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCopy}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied to Clipboard!' : 'Copy Formatted Markdown for Notion'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Source document: <code className="font-mono text-slate-700">/DOCUMENTATION.md</code> in workspace root.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
