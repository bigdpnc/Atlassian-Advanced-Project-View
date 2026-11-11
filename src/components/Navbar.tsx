import React from 'react';
import {
  Layers,
  LayoutGrid,
  Calendar,
  Users,
  GitCommit,
  FlaskConical,
  Zap,
  Plus,
  RotateCcw,
  Download,
  Upload,
  Check,
  ChevronDown,
  BookOpen,
  Sparkles,
  Globe,
  GitMerge,
} from 'lucide-react';
import { ProjectEntity } from '../types/project';

interface NavbarProps {
  currentView: 'gantt' | 'grid' | 'resources' | 'baselines';
  onChangeView: (view: 'gantt' | 'grid' | 'resources' | 'baselines') => void;
  projects: ProjectEntity[];
  selectedProjectId: string;
  onChangeSelectedProject: (id: string) => void;
  crossProjectCount: number;
  autoCascade: boolean;
  onToggleAutoCascade: () => void;
  showCriticalPath: boolean;
  onToggleCriticalPath: () => void;
  showBaselineComparison: boolean;
  onToggleBaselineComparison: () => void;
  whatIfMode: boolean;
  onToggleWhatIfMode: () => void;
  onAddNewTask: () => void;
  onOpenBaselineModal: () => void;
  onResetProject: (template: string) => void;
  onExportJSON: () => void;
  onOpenQAModal: () => void;
  onOpenDocsModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onChangeView,
  projects,
  selectedProjectId,
  onChangeSelectedProject,
  crossProjectCount,
  autoCascade,
  onToggleAutoCascade,
  showCriticalPath,
  onToggleCriticalPath,
  showBaselineComparison,
  onToggleBaselineComparison,
  whatIfMode,
  onToggleWhatIfMode,
  onAddNewTask,
  onOpenBaselineModal,
  onResetProject,
  onExportJSON,
  onOpenQAModal,
  onOpenDocsModal,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Jira / Atlassian Branding & Project Context */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">
                  Jira Project Engine
                </span>
                <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30">
                  Cross-Project PDM
                </span>
              </div>

              {/* Dynamic Project Portfolio Scope Selector */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <select
                  value={selectedProjectId}
                  onChange={e => onChangeSelectedProject(e.target.value)}
                  className="text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 rounded-md px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">🌐 Global Portfolio (All 3 Projects)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.key}] {p.name}
                    </option>
                  ))}
                </select>

                {crossProjectCount > 0 && selectedProjectId === 'all' && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] bg-purple-900/60 text-purple-200 border border-purple-500/40 px-1.5 py-0.5 rounded font-mono font-bold"
                    title="Real-time dependencies connecting tasks across different Jira projects"
                  >
                    <GitMerge className="w-3 h-3 text-purple-400" />
                    {crossProjectCount} Cross-Project Links
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          {/* View Mode Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => onChangeView('gantt')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentView === 'gantt'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Gantt Timeline
            </button>

            <button
              onClick={() => onChangeView('grid')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentView === 'grid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              WBS Grid
            </button>

            <button
              onClick={() => onChangeView('resources')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentView === 'resources'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Resource Workload
            </button>

            <button
              onClick={() => onChangeView('baselines')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentView === 'baselines'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              Baseline Diff
            </button>
          </nav>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dynamic Auto-Cascade Toggle */}
          <button
            onClick={onToggleAutoCascade}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              autoCascade
                ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Automatically update all downstream dependent tasks and deadlines when any task shifts"
          >
            <span
              className={`w-2 h-2 rounded-full ${autoCascade ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`}
            />
            Auto-Cascade Ripple
          </button>

          {/* Baseline Overlay Toggle */}
          <button
            onClick={onToggleBaselineComparison}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showBaselineComparison
                ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle baseline ghost bars and slippage variance badges"
          >
            <GitCommit className="w-3.5 h-3.5 text-purple-400" />
            Baseline Ghost
          </button>

          {/* What-If Sandbox Mode */}
          <button
            onClick={onToggleWhatIfMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              whatIfMode
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md ring-2 ring-amber-400/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Simulate schedule shifts and delays in memory before committing"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            What-If Sandbox
          </button>

          {/* QA Scenario Walkthrough */}
          <button
            onClick={onOpenQAModal}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-700/60 transition-all cursor-pointer shadow-xs"
            title="Open Interactive QA Scenarios to test PDM cascades, auto-leveling & baselines"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            QA Scenarios
          </button>

          {/* Docs & Notion Export */}
          <button
            onClick={onOpenDocsModal}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-xs"
            title="Open Technical Architecture Documentation and Export to Notion"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            Docs & Notion
          </button>

          {/* Export JSON / Template Selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={onExportJSON}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 cursor-pointer"
              title="Export Project Schedule to JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => onResetProject('default')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 cursor-pointer"
              title="Reset to Sample Enterprise Project"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Add Work Item Button */}
          <button
            onClick={onAddNewTask}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Issue
          </button>
        </div>
      </div>
    </header>
  );
};
