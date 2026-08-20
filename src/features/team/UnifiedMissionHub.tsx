import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertOctagon,
  ArrowLeft, 
  CheckSquare,
  FileText,
  Link2,
  Menu,
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
const LeadsCRMView = lazy(() => import('./LeadsCRMView').then((m) => ({ default: m.LeadsCRMView })));
const WorkflowGuardrailView = lazy(() => import('./WorkflowGuardrailView').then((m) => ({ default: m.WorkflowGuardrailView })));
const WorkLinksView = lazy(() => import('./WorkLinksView').then((m) => ({ default: m.WorkLinksView })));
const VisualCanvasView = lazy(() => import('./VisualCanvasView').then((m) => ({ default: m.VisualCanvasView })));
const ProblemBankView = lazy(() => import('./ProblemBankView').then((m) => ({ default: m.ProblemBankView })));
const TeamTasksView = lazy(() => import('./TeamTasksView').then((m) => ({ default: m.TeamTasksView })));
const TeamNotesView = lazy(() => import('./TeamNotesView').then((m) => ({ default: m.TeamNotesView })));
const TeamChatView = lazy(() => import('./TeamChatView').then((m) => ({ default: m.TeamChatView })));
import { useUnreadCount } from './team-chat-unread';
import { useMissionHubNavSlot } from './mission-hub-nav-slot';

interface UnifiedMissionHubProps {
  mission: Mission | TeamMissionItem;
  onBack?: () => void;
  initialTab?: TabKey;
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

export function UnifiedMissionHub({ mission, onBack, initialTab = 'tasks' }: UnifiedMissionHubProps) {
  const [selectedTab, setSelectedTab] = useState<TabKey>(initialTab);
  const [mobileNavVisible, setMobileNavVisible] = useState(false);
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

  // Chat is a focused mobile surface. Tell the app shell to temporarily remove
  // its bottom navigation and reclaim that space for messages and the composer.
  useEffect(() => {
    if (activeTab === 'chat' && !mobileNavVisible) {
      document.documentElement.dataset.chatFocus = 'true';
    } else {
      delete document.documentElement.dataset.chatFocus;
    }

    return () => {
      delete document.documentElement.dataset.chatFocus;
    };
  }, [activeTab, mobileNavVisible]);

  useEffect(() => {
    const openChat = () => {
      if (chatDraftRef) clearChatDraft();
      setSelectedTab('chat');
    };
    window.addEventListener('missioncontrol:open-project-chat', openChat);
    return () => window.removeEventListener('missioncontrol:open-project-chat', openChat);
  }, [chatDraftRef, clearChatDraft]);

  const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon; count?: number }> = [
    { key: 'tasks', label: 'Tasks', icon: CheckSquare, count: teamTasks.length },
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
        {tabs.map(({ key, label, icon: Icon, count }) => {
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
    <div className={`relative flex min-w-0 flex-1 flex-col text-text-primary ${activeTab === 'chat' ? 'h-full overflow-hidden' : 'overflow-y-auto'}`}>
      {navSlot && activeTab !== 'chat' ? createPortal(navBar, navSlot) : null}

      {/* The project summary is useful while working in modules, but redundant
          in chat where it steals a large part of a phone viewport. */}
      {activeTab !== 'chat' ? (
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

          <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-secondary ${activeTab === 'canvas' ? 'hidden' : ''}`}>
            <span>
              <span className="font-semibold tabular-nums text-accent">{taskProgress}%</span> sprint
              <span className="ml-1 tabular-nums text-text-muted">({completedTasks}/{teamTasks.length})</span>
            </span>
            <span className="h-3 w-px bg-borderSoft" />
            <span><span className="font-semibold tabular-nums text-success">{leads.filter((l) => l.status === 'active_pilot').length}</span> live</span>
            <span className="h-3 w-px bg-borderSoft" />
            <span><span className="font-semibold tabular-nums text-text-primary">{leads.length}</span> leads</span>
            <span className="h-3 w-px bg-borderSoft" />
            <span><span className={`font-semibold tabular-nums ${problems.length > 0 ? 'text-danger' : 'text-text-primary'}`}>{problems.length}</span> issues</span>
          </div>
        </div>
      ) : (
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-borderSoft/50 px-2 sm:px-3">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to projects"
              className="flex h-9 min-h-0 w-9 min-w-0 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-panel2 hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="truncate text-sm font-semibold text-text-primary">Chat</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavVisible((visible) => !visible)}
            aria-expanded={mobileNavVisible}
            aria-controls="mobile-primary-navigation"
            className="flex h-9 min-h-0 shrink-0 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-panel2 hover:text-text-primary lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
            <span>{mobileNavVisible ? 'Hide navigation' : 'Navigation'}</span>
          </button>
        </div>
      )}


      {/* Main Tab Content Surface */}
      <div className={`w-full ${activeTab === 'chat' ? 'min-h-0 flex-1 p-2 sm:p-4' : 'p-4 sm:p-6'}`}>
        {activeTab === 'chat' && (
          <TeamChatView missionId={mission.id} onOpenRef={(ref) => setActiveTab(REF_TAB[ref.kind])} />
        )}
        <Suspense
          fallback={
            <div className="flex min-h-[280px] items-center justify-center" role="status" aria-label="Loading">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-borderSoft border-t-accent" />
            </div>
          }
        >
        {activeTab === 'tasks' && <TeamTasksView filterMissionId={mission.id} />}
        {activeTab === 'leads' && <LeadsCRMView missionId={mission.id} />}
        {activeTab === 'workflows' && <WorkflowGuardrailView missionId={mission.id} />}
        {activeTab === 'canvas' && <VisualCanvasView missionId={mission.id} />}
        {activeTab === 'links' && <WorkLinksView missionId={mission.id} />}
        {activeTab === 'problems' && <ProblemBankView missionId={mission.id} />}
        {activeTab === 'notes' && <TeamNotesView filterMissionId={mission.id} />}
        </Suspense>
      </div>

      {/* Chat rides along as a floating button instead of a tab, so it stays one
          tap away from whatever tab you are working in. Sits left of the quick
          actions dock so the two never overlap. */}
      {activeTab !== 'chat' ? createPortal(
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          aria-label={unreadChat > 0 ? `Open project chat, ${unreadChat} unread` : 'Open project chat'}
          className="fixed bottom-[calc(var(--mobile-nav-height)+1rem)] right-4 z-[39] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-accent text-[rgb(var(--accent-contrast))] shadow-[0_10px_28px_rgb(var(--shadow-color)/0.4)] transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6 lg:z-[66] lg:h-11 lg:w-11"
        >
          <MessageSquare className="h-5 w-5" />
          {unreadChat > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold tabular-nums text-white">
              {unreadChat > 99 ? '99+' : unreadChat}
            </span>
          )}
        </button>
      , document.body) : null}
    </div>
  );
}
