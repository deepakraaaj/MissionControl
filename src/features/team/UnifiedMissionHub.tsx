import { useMemo, useState } from 'react';
import { 
  CheckSquare, 
  Users, 
  ShieldCheck, 
  Link2, 
  Network, 
  AlertOctagon, 
  ArrowLeft, 
  Play, 
  Target,
  Activity,
  Dumbbell,
  Tag,
  Compass,
  Layers,
  FileText
} from 'lucide-react';
import type { Mission } from '../missions/mission-types';
import type { TeamMissionItem } from './team-seed';
import { useTeamStore } from './team-store';
import { LeadsCRMView } from './LeadsCRMView';
import { WorkflowGuardrailView } from './WorkflowGuardrailView';
import { WorkLinksView } from './WorkLinksView';
import { VisualCanvasView } from './VisualCanvasView';
import { ProblemBankView } from './ProblemBankView';
import { TeamTasksView } from './TeamTasksView';
import { TeamNotesView } from './TeamNotesView';

interface UnifiedMissionHubProps {
  mission: Mission | TeamMissionItem;
  onBack?: () => void;
}

type TabKey = 'tasks' | 'leads' | 'workflows' | 'canvas' | 'links' | 'problems' | 'notes';

export function UnifiedMissionHub({ mission, onBack }: UnifiedMissionHubProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('tasks');
  const teamState = useTeamStore();
  const allTeamTasks = teamState.teamTasks;
  const allLeads = teamState.leads;
  const allWorkflows = teamState.workflows;
  const allWorkLinks = teamState.workLinks;
  const allProblems = teamState.problems;
  const allNotes = teamState.teamNotes;

  const teamTasks = useMemo(
    () => allTeamTasks.filter((task) => task.missionId === mission.id),
    [allTeamTasks, mission.id],
  );
  const leads = useMemo(
    () => allLeads.filter((lead) => lead.missionId === mission.id),
    [allLeads, mission.id],
  );
  const workflows = useMemo(
    () => allWorkflows.filter((workflow) => workflow.missionId === mission.id),
    [allWorkflows, mission.id],
  );
  const workLinks = useMemo(
    () => allWorkLinks.filter((link) => link.missionId === mission.id),
    [allWorkLinks, mission.id],
  );
  const problems = useMemo(
    () => allProblems.filter((problem) => problem.missionId === mission.id),
    [allProblems, mission.id],
  );
  const notes = useMemo(
    () => allNotes.filter((note) => note.missionId === mission.id),
    [allNotes, mission.id],
  );

  const completedTasks = teamTasks.filter((t) => t.status === 'done').length;
  const taskProgress = teamTasks.length > 0 ? Math.round((completedTasks / teamTasks.length) * 100) : 0;

  const demoLink = workLinks.find((w) => w.category === 'demo');

  const getMissionIcon = () => {
    const title = mission.title.toLowerCase();
    if (title.includes('turf')) return <Activity className="w-7 h-7 text-emerald-400" />;
    if (title.includes('gym')) return <Dumbbell className="w-7 h-7 text-blue-400" />;
    if (title.includes('deal') || title.includes('flash')) return <Tag className="w-7 h-7 text-amber-400" />;
    if (title.includes('popup') || title.includes('radar')) return <Compass className="w-7 h-7 text-purple-400" />;
    return <Layers className="w-7 h-7 text-cyan-400" />;
  };

  return (
    <div className="-mt-3 flex min-w-0 flex-1 flex-col overflow-y-auto text-text-primary sm:-mt-6">
      {/* Top Mission Banner & Live Demo Launcher */}
      <div className="relative space-y-3 border-b border-borderSoft/30 bg-panel/35 p-3 sm:p-4">
        {/* Breadcrumb / Back */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to projects
          </button>

          <div className="flex items-center gap-2">
            {activeTab !== 'canvas' && <button type="button" onClick={() => setActiveTab('canvas')} className="flex items-center gap-2 rounded-xl border border-accent/35 bg-accent/10 px-3.5 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-accent/18">
              <Network className="h-3.5 w-3.5" /> View diagram
            </button>}
            {demoLink && (
              <a href={demoLink.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:scale-105">
                <Play className="h-3.5 w-3.5 fill-slate-950" /><span>Launch Live Mobile Demo</span>
              </a>
            )}
          </div>
        </div>

        {/* Mission Title & Objective */}
        <div className="flex items-start gap-4">
          <div className="flex flex-shrink-0 items-center justify-center rounded-2xl border border-borderSoft/35 bg-panel2/55 p-3.5">
            {getMissionIcon()}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
                {mission.title}
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold uppercase font-mono">
                {mission.status}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-text-secondary sm:text-sm">
              {mission.description}
            </p>

            {mission.objective && (
              <div className="flex items-center gap-2 pt-1 text-xs text-text-muted">
                <Target className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate"><strong>Goal:</strong> {mission.objective}</span>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Pill Bar */}
        <div className={`grid grid-cols-2 gap-2 border-t border-borderSoft/25 pt-3 sm:grid-cols-4 ${activeTab === 'canvas' ? 'hidden' : ''}`}>
          <div className="rounded-xl border border-borderSoft/30 bg-panel2/35 p-2.5">
            <div className="font-mono text-[10px] uppercase text-text-muted">Sprint Progress</div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
              {taskProgress}% ({completedTasks}/{teamTasks.length})
            </div>
          </div>

          <div className="rounded-xl border border-borderSoft/30 bg-panel2/35 p-2.5">
            <div className="font-mono text-[10px] uppercase text-text-muted">Active Clients</div>
            <div className="text-sm font-bold text-blue-400 font-mono mt-0.5">
              {leads.filter((l) => l.status === 'active_pilot').length} Venues Live
            </div>
          </div>

          <div className="rounded-xl border border-borderSoft/30 bg-panel2/35 p-2.5">
            <div className="font-mono text-[10px] uppercase text-text-muted">Total Leads</div>
            <div className="text-sm font-bold text-purple-400 font-mono mt-0.5">
              {leads.length} Logged
            </div>
          </div>

          <div className="rounded-xl border border-borderSoft/30 bg-panel2/35 p-2.5">
            <div className="font-mono text-[10px] uppercase text-text-muted">Open Issues</div>
            <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">
              {problems.length} Logged
            </div>
          </div>
        </div>

        {/* Unified Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-borderSoft/25 pt-3 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'border border-accent/45 bg-accent/12 text-accent shadow-sm'
                : 'border border-transparent text-text-secondary hover:bg-panel2/65 hover:text-text-primary'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Sprints & Tasks ({teamTasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'leads'
                ? 'border border-accent/45 bg-accent/12 text-accent shadow-sm'
                : 'border border-transparent text-text-secondary hover:bg-panel2/65 hover:text-text-primary'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Leads & CRM ({leads.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workflows')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'workflows'
                ? 'border border-accent/45 bg-accent/12 text-accent shadow-sm'
                : 'border border-transparent text-text-secondary hover:bg-panel2/65 hover:text-text-primary'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Process ({workflows.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'canvas'
                ? 'border border-accent/45 bg-accent/12 text-accent shadow-sm'
                : 'border border-transparent text-text-secondary hover:bg-panel2/65 hover:text-text-primary'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Diagram</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'links'
                ? 'border border-accent/45 bg-accent/12 text-accent shadow-sm'
                : 'border border-transparent text-text-secondary hover:bg-panel2/65 hover:text-text-primary'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Links ({workLinks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('problems')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'problems'
                ? 'border border-accent/45 bg-accent/12 text-accent shadow-sm'
                : 'border border-transparent text-text-secondary hover:bg-panel2/65 hover:text-text-primary'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Issues ({problems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'border border-accent/45 bg-accent/12 text-accent shadow-sm'
                : 'border border-transparent text-text-secondary hover:bg-panel2/65 hover:text-text-primary'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notes ({notes.length})</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content Surface */}
      <div className="w-full p-4 sm:p-6">
        {activeTab === 'tasks' && <TeamTasksView filterMissionId={mission.id} />}
        {activeTab === 'leads' && <LeadsCRMView missionId={mission.id} />}
        {activeTab === 'workflows' && <WorkflowGuardrailView missionId={mission.id} />}
        {activeTab === 'canvas' && <VisualCanvasView missionId={mission.id} />}
        {activeTab === 'links' && <WorkLinksView missionId={mission.id} />}
        {activeTab === 'problems' && <ProblemBankView missionId={mission.id} />}
        {activeTab === 'notes' && <TeamNotesView filterMissionId={mission.id} />}
      </div>
    </div>
  );
}
