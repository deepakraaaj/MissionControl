import { useState } from 'react';
import { CheckCircle2, Circle, ShieldCheck, ArrowRight, User, Calendar, AlertCircle, Target } from 'lucide-react';
import { useTeamStore } from './team-store';
import type { WorkflowSOP } from './team-types';

interface WorkflowGuardrailViewProps {
  missionId: string;
}

export function WorkflowGuardrailView({ missionId }: WorkflowGuardrailViewProps) {
  const workflows = useTeamStore((s) => s.workflows);
  const toggleSOPStep = useTeamStore((s) => s.toggleSOPStep);
  const missionWorkflows = workflows.filter((w) => w.missionId === missionId);

  const activeSOP = missionWorkflows[0];

  if (!activeSOP) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
        <ShieldCheck className="w-10 h-10 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No SOP Workflow Configured</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Add a step-by-step execution protocol so your team follows standard operating procedures without drifting.
        </p>
      </div>
    );
  }

  const completedCount = activeSOP.steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / activeSOP.steps.length) * 100);

  return (
    <div className="space-y-4">
      {/* SOP Header & Guardrail Progress */}
      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {activeSOP.title}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${
                  activeSOP.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {activeSOP.status.replace('_', ' ')}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{activeSOP.description}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-bold font-mono text-emerald-400">{progressPercent}% Completed</div>
            <div className="text-[11px] text-slate-500">{completedCount} of {activeSOP.steps.length} Milestones</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
          <Target className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold text-slate-300">Target Outcome:</span>
          <span>{activeSOP.targetOutcome}</span>
        </div>
      </div>

      {/* Step Sequence List (Guardrails) */}
      <div className="space-y-2.5">
        {activeSOP.steps.map((step, idx) => {
          const isNextUp = !step.completed && (idx === 0 || activeSOP.steps[idx - 1].completed);

          return (
            <div
              key={step.id}
              onClick={() => toggleSOPStep(activeSOP.id, step.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                step.completed
                  ? 'bg-slate-900/40 border-emerald-500/30 text-slate-300 hover:bg-slate-900/60'
                  : isNextUp
                  ? 'bg-slate-900 border-amber-500/50 shadow-lg shadow-amber-500/5 hover:border-amber-400'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              {/* Checkbox Icon */}
              <div className="mt-0.5 flex-shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className={`w-5 h-5 ${isNextUp ? 'text-amber-400' : 'text-slate-600'}`} />
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                    STEP {step.stepNumber}
                  </span>
                  <h4 className={`text-xs font-semibold ${
                    step.completed
                      ? 'text-slate-300 line-through opacity-80'
                      : isNextUp
                      ? 'text-white'
                      : 'text-slate-400'
                  }`}>
                    {step.title}
                  </h4>
                  {isNextUp && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider animate-pulse">
                      Current Action
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {step.description}
                </p>

                {step.completed && step.completedBy && (
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-emerald-400/90 font-mono">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> Completed by {step.completedBy}
                    </span>
                    {step.completedAt && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3 h-3" /> {step.completedAt}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
