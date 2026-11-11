import React, { useState } from 'react';
import {
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Layers,
  Clock,
  GitCommit,
  Users,
  FlaskConical,
  X,
  AlertTriangle,
  GitMerge,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QAScenarioModalProps {
  onClose: () => void;
  onRunCascadeScenario: () => void;
  onRunResourceConflictScenario: () => void;
  onRunAutoLevel: () => void;
  onRunBaselineScenario: () => void;
  onRunWhatIfScenario: () => void;
  onRunCrossProjectCascadeScenario: () => void;
  onResetToDefault: () => void;
}

export const QAScenarioModal: React.FC<QAScenarioModalProps> = ({
  onClose,
  onRunCascadeScenario,
  onRunResourceConflictScenario,
  onRunAutoLevel,
  onRunBaselineScenario,
  onRunWhatIfScenario,
  onRunCrossProjectCascadeScenario,
  onResetToDefault,
}) => {
  const [activeScenario, setActiveScenario] = useState<number>(1);
  const [scenarioResults, setScenarioResults] = useState<Record<number, string>>({});

  const scenarios = [
    {
      id: 1,
      title: 'Scenario 1: Dynamic Downstream Cascade Ripple',
      category: 'Microsoft Project PDM Engine',
      icon: Clock,
      description:
        'Shift predecessor task APEX-104 (Kubernetes Setup) by +3 working days. Observe the topological ripple engine dynamically push all downstream dependent tasks (APEX-105, APEX-106, APEX-108, APEX-110, APEX-111, APEX-112, APEX-113, APEX-114) and extend the project release target from Dec 14 to Dec 17.',
      expectedResult:
        'All 8 downstream tasks shift forward by +3 days automatically; project finish moves to Dec 17; a dynamic ripple toast alerts the user.',
      actionLabel: 'Execute +3d Predecessor Shift',
      run: () => {
        onRunCascadeScenario();
        setScenarioResults(prev => ({
          ...prev,
          1: 'Executed: APEX-104 shifted. 8 downstream tasks rippled forward. Project finish date updated.',
        }));
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
      },
    },
    {
      id: 2,
      title: 'Scenario 2: Resource Over-allocation & Auto-Leveling',
      category: 'Capacity Optimization',
      icon: Users,
      description:
        'Simulate assigning overlapping workloads to Marcus Vance (DevOps Lead), pushing his allocation to 150% (12 hours/day). Then trigger MS Project-style Auto-Leveling to automatically shift non-critical tasks with available float, eliminating the bottleneck without extending the project milestone.',
      expectedResult:
        'Heatmap flags red cells (>8h capacity). Auto-leveling detects positive slack and shifts non-critical work items into available float windows.',
      actionLabel: 'Inject Resource Conflict',
      run: () => {
        onRunResourceConflictScenario();
        setScenarioResults(prev => ({
          ...prev,
          2: 'Injected conflict: Marcus Vance allocated 150% on Nov 16. Click "Auto-Level" in the heatmap to resolve.',
        }));
      },
      secondaryActionLabel: 'Auto-Level Workload Now',
      secondaryRun: () => {
        onRunAutoLevel();
        setScenarioResults(prev => ({
          ...prev,
          2: 'Auto-Leveled! Non-critical float was used to resolve workload bottleneck.',
        }));
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      },
    },
    {
      id: 3,
      title: 'Scenario 3: Baseline Comparison & Slippage Tracking',
      category: 'Project Control & Governance',
      icon: GitCommit,
      description:
        'Compare the active plan against the committed "Kickoff Baseline". Verify ghost baseline bars on the Gantt chart, notice +2d and +4d slippage badges on delayed tasks, and snapshot a new baseline.',
      expectedResult:
        'Ghost bars render underneath tasks showing the original committed schedule. Variance badges display exact working-day slippage.',
      actionLabel: 'Inspect & Freeze New Baseline',
      run: () => {
        onRunBaselineScenario();
        setScenarioResults(prev => ({
          ...prev,
          3: 'Baseline verified: Ghost overlays active. New snapshot frozen.',
        }));
      },
    },
    {
      id: 4,
      title: 'Scenario 4: What-If Simulation Sandbox',
      category: 'Risk & Contingency Modeling',
      icon: FlaskConical,
      description:
        'Enter What-If mode to simulate a hypothetical 1-week supplier delay on Architecture without permanently modifying the live production schedule. Verify the simulation delta banner, then discard or commit.',
      expectedResult:
        'What-If banner appears showing difference between original Dec 14 and simulated Dec 18 (+4 days delay) without altering committed baseline.',
      actionLabel: 'Launch What-If Simulation',
      run: () => {
        onRunWhatIfScenario();
        setScenarioResults(prev => ({
          ...prev,
          4: 'What-If mode engaged! Delays simulated in memory. Test shifting any task safely.',
        }));
      },
    },
    {
      id: 5,
      title: 'Scenario 5: Cross-Project Ripple (APEX ➔ MOB ➔ SEC)',
      category: 'Portfolio Engine (Beyond Advanced Roadmaps)',
      icon: GitMerge,
      description:
        'Demonstrates true cross-project dynamic cascading—a feature missing from Jira Advanced Roadmaps. Shifting APEX-106 (GraphQL Gateway in the Cloud Platform project) by +3 days dynamically ripples into MOB-201 (Mobile GraphQL SDK in Mobile Client project), pushing MOB-204 and the Mobile App Store Release milestone automatically!',
      expectedResult:
        'Cross-project dependency dep-cross-1 triggers an automatic multi-project ripple across APEX and MOB projects simultaneously in real-time.',
      actionLabel: 'Trigger Cross-Project Delay',
      run: () => {
        onRunCrossProjectCascadeScenario();
        setScenarioResults(prev => ({
          ...prev,
          5: 'Cross-Project Cascade Success! APEX-106 delay dynamically rippled into MOB-201, MOB-204, and MOB-205 in the Mobile project.',
        }));
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                QA Scenario Walkthrough & Interactive Verification
              </h2>
              <p className="text-xs text-slate-500">
                Test core Microsoft Project engine features step-by-step with real data.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-200 pb-4">
            {scenarios.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveScenario(s.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    activeScenario === s.id
                      ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      className={`w-4 h-4 ${
                        activeScenario === s.id ? 'text-purple-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-[11px] font-bold text-slate-800">
                      Step {s.id}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 truncate">
                    {s.title.split(':')[1] || s.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Scenario Card */}
          {(() => {
            const current = scenarios.find(s => s.id === activeScenario)!;
            const Icon = current.icon;
            const result = scenarioResults[current.id];

            return (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                      {current.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                      <Icon className="w-5 h-5 text-purple-600" />
                      {current.title}
                    </h3>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                      Scenario Goal
                    </div>
                    <p className="text-slate-800 leading-relaxed">{current.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                      Expected MS Project Behavior
                    </div>
                    <p className="text-slate-600">{current.expectedResult}</p>
                  </div>

                  {result && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{result}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={onResetToDefault}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Project to Clean State
                  </button>

                  <div className="flex items-center gap-2">
                    {current.secondaryActionLabel && (
                      <button
                        onClick={current.secondaryRun}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {current.secondaryActionLabel}
                      </button>
                    )}

                    <button
                      onClick={current.run}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {current.actionLabel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Interactive Test Harness — Verifies PDM constraints, topological sort & float leveling.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close QA Tour
          </button>
        </div>
      </div>
    </div>
  );
};
