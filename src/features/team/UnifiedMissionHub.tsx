import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertOctagon,
  ArrowLeft, 
  CheckSquare,
  FileText,
  Link2,
  MessageSquare,
  Network,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Mission } from '../missions/mission-types';
import type { ChatRef } from './team-types';
import type { TeamMissionItem } from './team-seed';
import { useTeamStore } from './team-store';
import { LeadsCRMView } from './LeadsCRMView';
import { WorkflowGuardrailView } from './WorkflowGuardrailView';
import { WorkLinksView } from './WorkLinksView';
import { VisualCanvasView } from './VisualCanvasView';
import { ProblemBankView } from './ProblemBankView';
import { TeamTasksView } from './TeamTasksView';
import { TeamNotesView } from './TeamNotesView';
import { TeamChatView } from './TeamChatView';
import { useUnreadCount } from './team-chat-unread';
import { useMissionHubNavSlot } from './mission-hub-nav-slot';

interface UnifiedMissionHubProps {
  mission: Mission | TeamMissionItem;
  onBack?: () => void;
}

type TabKey = 'chat' | 'tasks' | 'leads' | 'workflows' | 'canvas' | 'links' | 'problems' | 'notes';

/** Where each referenced item lives, so chat can jump straight to it. */
const REF_TAB: Record<ChatRef['kind'], TabKey> = {
  task: 'tasks',
  lead: 'leads',
  workflow: 'workflows',
  link: 'links',
  problem: 'problems',
  note: 'notes',
};

export function UnifiedMissionHub({ mission, onBack }: UnifiedMissionHubProps) {
  const [selectedTab, setSelectedTab] = useState<TabKey>('tasks');
  const navSlot = useMissionHubNavSlot();
  const unreadChat = useUnreadCount(mission.id);
  const chatDraftRef = useTeamStore((s) => s.chatDraftRef);
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

  const clearChatDraft = useTeamStore((s) => s.clearChatDraft);
  // A "Discuss" action elsewhere in the project pulls the hub onto the chat
  // tab until the message is sent or the attachment dropped.
  const activeTab: TabKey = chatDraftRef ? 'chat' : selectedTab;
  const setActiveTab = (key: TabKey) => {
    if (chatDraftRef) clearChatDraft();
    setSelectedTab(key);
  };

  const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon; count?: number; badge?: number }> = [
    { key: 'chat', label: 'Chat', icon: MessageSquare, badge: unreadChat },
    { key: 'tasks', label: 'Tasks & Sprints', icon: CheckSquare, count: teamTasks.length },
    { key: 'leads', label: 'Leads & CRM', icon: Users, count: leads.length },
    { key: 'workflows', label: 'Process', icon: ShieldCheck, count: workflows.length },
    { key: 'canvas', label: 'Diagram', icon: Network },
    { key: 'links', label: 'Links', icon: Link2, count: workLinks.length },
    { key: 'problems', label: 'Issues', icon: AlertOctagon, count: problems.length },
    { key: 'notes', label: 'Notes', icon: FileText, count: notes.length },
  ];

  const navBar = (
    <div className="flex h-full min-w-0 flex-1 items-stretch gap-3 sm:gap-5">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to projects"
        className="group my-auto flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-panel2 hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span className="hidden whitespace-nowrap sm:inline">Back to projects</span>
      </button>

      <div className="my-auto h-5 w-px shrink-0 bg-borderSoft" />

      <nav aria-label="Project sections" className="flex h-full min-w-0 flex-1 items-stretch gap-5 overflow-x-auto scrollbar-none sm:gap-6">
        {tabs.map(({ key, label, icon: Icon, count, badge }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex h-full min-h-[2.25rem] shrink-0 cursor-pointer items-center gap-1.5 px-0.5 text-[13px] transition-colors ${
                isActive ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'}`} />
              <span className="whitespace-nowrap">{label}</span>
              {count !== undefined && (
                <span className={`ml-0.5 text-[11px] font-normal tabular-nums ${isActive ? 'text-accent' : 'text-text-secondary'}`}>
                  {count}
                </span>
              )}
              {badge !== undefined && badge > 0 && (
                <span className="ml-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold tabular-nums text-[rgb(var(--accent-contrast))]">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] rounded-full transition-colors ${
                  isActive ? 'bg-accent' : 'bg-transparent group-hover:bg-borderSoft'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );

  const isActiveMission = mission.status === 'active';

  return (
    <div className={`flex min-w-0 flex-1 flex-col text-text-primary ${activeTab === 'chat' ? 'h-full overflow-hidden' : 'overflow-y-auto'}`}>
      {navSlot ? createPortal(navBar, navSlot) : null}

      {/* Compact project banner */}
      <div className="space-y-1.5 border-b border-borderSoft/60 bg-panel/40 px-4 py-3 sm:px-5">
        {navSlot ? null : navBar}

        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-base font-bold tracking-tight text-text-primary sm:text-lg">
            {mission.title}
          </h1>
          <span
            className={`shrink-0 rounded-full border px-2 py-px text-[10px] font-semibold uppercase tracking-wide ${
              isActiveMission
                ? 'border-success/40 bg-success/14 text-success'
                : 'border-borderSoft bg-panel2 text-text-secondary'
            }`}
          >
            {mission.status}
          </span>
        </div>

        <p
          className="truncate text-xs text-text-secondary"
          title={mission.objective ? `${mission.description}\n\nGoal: ${mission.objective}` : mission.description}
        >
          {mission.description}
          {mission.objective && (
            <>
              <span className="mx-1.5 text-text-muted">&middot;</span>
              <Target className="mr-1 inline h-3 w-3 -translate-y-px text-accent" />
              <span className="font-medium text-text-primary">Goal:</span> {mission.objective}
            </>
          )}
        </p>

        {/* Inline metric line */}
        <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-secondary ${activeTab === 'canvas' ? 'hidden' : ''}`}>
          <span>
            <span className="font-semibold tabular-nums text-accent">{taskProgress}%</span> sprint
            <span className="ml-1 tabular-nums text-text-muted">({completedTasks}/{teamTasks.length})</span>
          </span>
          <span className="h-3 w-px bg-borderSoft" />
          <span>
            <span className="font-semibold tabular-nums text-success">
              {leads.filter((l) => l.status === 'active_pilot').length}
            </span>{' '}
            live
          </span>
          <span className="h-3 w-px bg-borderSoft" />
          <span>
            <span className="font-semibold tabular-nums text-text-primary">{leads.length}</span> leads
          </span>
          <span className="h-3 w-px bg-borderSoft" />
          <span>
            <span className={`font-semibold tabular-nums ${problems.length > 0 ? 'text-danger' : 'text-text-primary'}`}>
              {problems.length}
            </span>{' '}
            issues
          </span>
        </div>
      </div>


      {/* Main Tab Content Surface */}
      <div className={`w-full ${activeTab === 'chat' ? 'min-h-0 flex-1 p-3 sm:p-4' : 'p-4 sm:p-6'}`}>
        {activeTab === 'chat' && (
          <TeamChatView missionId={mission.id} onOpenRef={(ref) => setActiveTab(REF_TAB[ref.kind])} />
        )}
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
