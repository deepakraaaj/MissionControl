import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertOctagon,
  ArrowLeft, 
  ChevronDown,
  CheckSquare,
  FileText,
  IndianRupee,
  LayoutDashboard,
  Link2,
  Menu,
  MessageSquare,
  Network,
  Pencil,
  Save,
  Settings,
  ShieldCheck,
  Target,
  UserCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Mission } from '../missions/mission-types';
import type { ChatRef, Lead, ProblemItem, TeamTask } from './team-types';
import type { TeamMissionItem } from './team-types';
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
import { useTeamRoomStore } from './team-room-store';

interface UnifiedMissionHubProps {
  mission: Mission | TeamMissionItem;
  onBack?: () => void;
  initialTab?: TabKey;
}

type TabKey = 'overview' | 'chat' | 'tasks' | 'leads' | 'workflows' | 'canvas' | 'links' | 'problems' | 'notes';

/** Where each referenced item lives, so chat can jump straight to it. */
const REF_TAB: Record<ChatRef['kind'], TabKey> = {
  task: 'tasks',
  lead: 'leads',
  workflow: 'workflows',
  link: 'links',
  problem: 'problems',
  note: 'notes',
};

type StrategyDraft = Pick<TeamMissionItem, 'title' | 'description' | 'why_it_matters' | 'objective' | 'definition_of_success' | 'customer_segment' | 'revenue_model'>;

function AutoGrowTextarea({ label, value, onChange, className = '' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return <textarea ref={ref} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} rows={1} className={`overflow-hidden resize-none rounded-xl border border-accent/40 bg-panel2/50 px-3 py-2 text-sm leading-6 text-text-primary outline-none focus:ring-2 focus:ring-accent/15 ${className}`} />;
}

function ProjectOverview({ mission, tasks, leads, problems, onUpdate, onOpenTasks, syncStatus, syncError }: {
  mission: Mission | TeamMissionItem;
  tasks: TeamTask[];
  leads: Lead[];
  problems: ProblemItem[];
  onUpdate?: (updates: Partial<TeamMissionItem>) => void;
  onOpenTasks: () => void;
  syncStatus: 'offline' | 'loading' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
}) {
  const teamMission = mission as TeamMissionItem;
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(() => ({
    status: teamMission.status,
    target_date: teamMission.target_date,
    is_pinned: teamMission.is_pinned,
    member_ids: teamMission.member_ids ?? [],
  }));
  const roomMembers = useTeamRoomStore((state) => state.members);
  const activeRoomId = useTeamRoomStore((state) => state.activeRoomId);
  const membersLoading = useTeamRoomStore((state) => state.membersLoading);
  const loadMembers = useTeamRoomStore((state) => state.loadMembers);
  const [draft, setDraft] = useState<StrategyDraft>({
    title: mission.title,
    description: mission.description,
    why_it_matters: mission.why_it_matters,
    objective: mission.objective,
    definition_of_success: mission.definition_of_success,
    customer_segment: teamMission.customer_segment ?? '',
    revenue_model: teamMission.revenue_model ?? '',
  });
  const beginEditing = () => {
    setDraft({
      title: mission.title,
      description: mission.description,
      why_it_matters: mission.why_it_matters,
      objective: mission.objective,
      definition_of_success: mission.definition_of_success,
      customer_segment: teamMission.customer_segment ?? '',
      revenue_model: teamMission.revenue_model ?? '',
    });
    setEditing(true);
  };
  const saveStrategy = (event: React.FormEvent) => {
    event.preventDefault();
    onUpdate?.(Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value?.trim() ?? ''])) as StrategyDraft);
    setEditing(false);
  };
  const openProjectSettings = () => {
    setSettingsDraft({
      status: teamMission.status,
      target_date: teamMission.target_date,
      is_pinned: teamMission.is_pinned,
      member_ids: teamMission.member_ids ?? [],
    });
    setSettingsOpen(true);
    if (activeRoomId) void loadMembers(activeRoomId);
  };
  const saveProjectSettings = () => {
    onUpdate?.(settingsDraft);
    setSettingsOpen(false);
  };
  const completed = tasks.filter((task) => task.status === 'done').length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const openProblems = problems.filter((problem) => problem.status !== 'solved');
  const activeLeads = leads.filter((lead) => lead.status === 'active_pilot' || lead.status === 'paid_client');
  const trackedMrr = leads.reduce((sum, lead) => sum + (lead.monthlyValue ?? 0), 0);
  const nextTasks = tasks.filter((task) => task.status !== 'done').slice(0, 3);
  const targetDate = mission.target_date
    ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(mission.target_date))
    : 'Not set';
  const metrics = [
    { label: 'Sprint progress', value: `${progress}%`, detail: `${completed}/${tasks.length} tasks done` },
    { label: 'Live clients', value: String(activeLeads.length), detail: `${leads.length} total leads` },
    { label: 'Tracked MRR', value: `₹${trackedMrr.toLocaleString('en-IN')}`, detail: 'From CRM values' },
    { label: 'Open issues', value: String(openProblems.length), detail: problems.length ? `${problems.length} logged` : 'No issues logged' },
  ];

  return (
    <form onSubmit={saveStrategy} className="mx-auto w-full max-w-7xl space-y-4">
      <section className="overflow-hidden rounded-2xl border border-borderSoft/60 bg-panel">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Project dashboard</span>
              <span className="rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-success">{mission.status.replace('_', ' ')}</span>
              <span className={`text-[10px] font-medium ${syncStatus === 'error' ? 'text-danger' : 'text-text-muted'}`} title={syncError ?? undefined}>
                {syncStatus === 'syncing' ? 'Saving to Supabase…' : syncStatus === 'synced' ? 'Saved to Supabase' : syncStatus === 'error' ? 'Sync failed' : 'Backend offline'}
              </span>
            </div>
            {editing ? <input autoFocus aria-label="Project name" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="w-full max-w-3xl rounded-xl border border-accent/40 bg-panel2/50 px-3 py-2 text-xl font-bold tracking-tight text-text-primary outline-none focus:ring-2 focus:ring-accent/15 sm:text-2xl" /> : <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">{mission.title}</h1>}
            {editing ? (
              <AutoGrowTextarea label="One-line summary" value={draft.description} onChange={(value) => setDraft((current) => ({ ...current, description: value }))} className="mt-2 w-full max-w-3xl" />
            ) : <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">{mission.description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={openProjectSettings} aria-label="Project settings" title="Project settings" className="flex h-9 w-9 items-center justify-center rounded-xl border border-borderSoft/60 bg-panel2/60 text-text-primary transition-colors hover:border-accent/40 hover:text-accent"><Settings className="h-3.5 w-3.5" /></button>
            {onUpdate && (editing ? <>
              <button type="button" onClick={() => setEditing(false)} className="flex h-9 items-center rounded-xl border border-borderSoft/60 bg-panel2/60 px-3 text-xs font-medium text-text-secondary hover:text-text-primary">Cancel</button>
              <button type="submit" aria-label="Save project summary" title="Save" className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-[rgb(var(--accent-contrast))] hover:bg-accentSoft"><Save className="h-4 w-4" /></button>
            </> : <button type="button" onClick={beginEditing} aria-label="Edit summary" title="Edit summary" className="flex h-9 w-9 items-center justify-center rounded-xl border border-borderSoft/60 bg-panel2/60 text-text-primary transition-colors hover:border-accent/40 hover:text-accent"><Pencil className="h-3.5 w-3.5" /></button>)}
            <div className="rounded-xl border border-borderSoft/60 bg-panel2/60 px-3 py-2 sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Target</p>
            <p className="mt-0.5 text-sm font-semibold text-text-primary">{targetDate}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-borderSoft/60 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <div key={metric.label} className={`border-borderSoft/60 p-3 sm:p-4 ${index % 2 ? 'border-l' : ''} ${index >= 2 ? 'border-t lg:border-t-0' : ''} lg:border-l`}>
              <p className="text-[11px] font-medium text-text-secondary">{metric.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{metric.value}</p>
              <p className="mt-0.5 text-[10px] text-text-muted">{metric.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {settingsOpen && (
        <section className="rounded-2xl border border-accent/30 bg-panel p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-bold text-text-primary">Project settings</h2><p className="mt-0.5 text-xs text-text-muted">Changes apply only to {mission.title}.</p></div>
            <button type="button" onClick={() => setSettingsOpen(false)} className="text-xs font-medium text-text-secondary hover:text-text-primary">Close</button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-xs font-semibold text-text-secondary">Status<select value={settingsDraft.status} onChange={(event) => setSettingsDraft((current) => ({ ...current, status: event.target.value as TeamMissionItem['status'] }))} className="mt-1.5 h-10 w-full rounded-xl border border-borderSoft bg-panel2 px-3 text-sm font-normal text-text-primary outline-none focus:border-accent"><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select></label>
            <label className="text-xs font-semibold text-text-secondary">Target date<input type="date" value={settingsDraft.target_date} onChange={(event) => setSettingsDraft((current) => ({ ...current, target_date: event.target.value }))} className="mt-1.5 h-10 w-full rounded-xl border border-borderSoft bg-panel2 px-3 text-sm font-normal text-text-primary outline-none focus:border-accent" /></label>
            <label className="mt-6 flex h-10 items-center gap-2 rounded-xl border border-borderSoft bg-panel2 px-3 text-sm font-medium text-text-primary"><input type="checkbox" checked={settingsDraft.is_pinned} onChange={(event) => setSettingsDraft((current) => ({ ...current, is_pinned: event.target.checked }))} className="accent-[rgb(var(--accent))]" />Pin this project</label>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-text-secondary">Project members</p>
            {membersLoading ? <p className="mt-2 text-xs text-text-muted">Loading room members…</p> : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {roomMembers.filter((member) => member.status === 'approved').map((member) => {
                  const checked = settingsDraft.member_ids.includes(member.userId);
                  return <label key={member.userId} className="flex items-center gap-2 rounded-xl border border-borderSoft/60 bg-panel2/45 px-3 py-2.5 text-sm text-text-primary"><input type="checkbox" checked={checked} onChange={() => setSettingsDraft((current) => ({ ...current, member_ids: checked ? current.member_ids.filter((id) => id !== member.userId) : [...current.member_ids, member.userId] }))} className="accent-[rgb(var(--accent))]" /><span className="min-w-0"><span className="block truncate font-medium">{member.displayName || member.email}</span><span className="block truncate text-[10px] capitalize text-text-muted">{member.role}</span></span></label>;
                })}
                {!roomMembers.some((member) => member.status === 'approved') && <p className="text-xs text-text-muted">No approved room members found.</p>}
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end"><button type="button" onClick={saveProjectSettings} className="flex h-9 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-[rgb(var(--accent-contrast))]"><Save className="h-4 w-4" />Save settings</button></div>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-borderSoft/60 bg-panel p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Target customer</p>
          {editing ? <AutoGrowTextarea label="Target customer" value={draft.customer_segment ?? ''} onChange={(value) => setDraft((current) => ({ ...current, customer_segment: value }))} className="mt-2 w-full" /> : <p className="mt-2 text-sm leading-6 text-text-primary">{teamMission.customer_segment || 'Not defined yet. Edit the summary to add it.'}</p>}
        </article>
        <article className="rounded-2xl border border-borderSoft/60 bg-panel p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-danger">Problem statement</p>
          {editing ? <AutoGrowTextarea label="Problem statement" value={draft.why_it_matters} onChange={(value) => setDraft((current) => ({ ...current, why_it_matters: value }))} className="mt-2 w-full" /> : <p className="mt-2 text-sm leading-6 text-text-primary">{mission.why_it_matters || mission.description}</p>}
        </article>
        <article className="rounded-2xl border border-borderSoft/60 bg-panel p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">How we solve it</p>
          {editing ? <AutoGrowTextarea label="How we solve it" value={draft.objective} onChange={(value) => setDraft((current) => ({ ...current, objective: value }))} className="mt-2 w-full" /> : <p className="mt-2 text-sm leading-6 text-text-primary">{mission.objective || mission.description}</p>}
        </article>
        <article className="rounded-2xl border border-borderSoft/60 bg-panel p-4 sm:p-5">
          <div className="flex items-center gap-1.5 text-success"><IndianRupee className="h-3.5 w-3.5" /><p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Working revenue model</p></div>
          {editing ? <AutoGrowTextarea label="Revenue model" value={draft.revenue_model ?? ''} onChange={(value) => setDraft((current) => ({ ...current, revenue_model: value }))} className="mt-2 w-full" /> : <p className="mt-2 text-sm leading-6 text-text-primary">{teamMission.revenue_model || 'Not defined yet. Edit the summary to add it.'}</p>}
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-borderSoft/60 bg-panel p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Definition of success</p>
          {editing ? <AutoGrowTextarea label="Definition of success" value={draft.definition_of_success} onChange={(value) => setDraft((current) => ({ ...current, definition_of_success: value }))} className="mt-2 w-full font-medium" /> : <p className="mt-2 text-sm font-medium leading-6 text-text-primary">{mission.definition_of_success || 'Define a measurable success outcome for this project.'}</p>}
        </article>
        <article className="rounded-2xl border border-borderSoft/60 bg-panel p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Next moves</p>
          <div className="mt-2 space-y-2">
            {nextTasks.length ? nextTasks.map((task) => (
              <button key={task.id} type="button" onClick={onOpenTasks} title="Open in project tasks" className="group flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left text-sm text-text-primary transition-colors hover:bg-accent/[0.06] hover:text-accent">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 leading-5">{task.title}</span>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-panel2 px-2 py-0.5 text-[10px] font-medium text-text-secondary group-hover:text-accent"><UserCheck className="h-3 w-3" />{task.assigneeRole}</span>
              </button>
            )) : <p className="text-sm text-text-secondary">No open tasks. Add the next experiment or customer action.</p>}
          </div>
        </article>
      </section>
    </form>
  );
}

export function UnifiedMissionHub({ mission, onBack, initialTab = 'overview' }: UnifiedMissionHubProps) {
  const [selectedTab, setSelectedTab] = useState<TabKey>(initialTab);
  const [mobileNavVisible, setMobileNavVisible] = useState(false);
  const [projectSectionsOpen, setProjectSectionsOpen] = useState(false);
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
  const isSharedTeamProject = teamState.teamMissions.some((item) => item.id === mission.id);

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
    setProjectSectionsOpen(false);
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
    { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'tasks', label: 'Tasks', icon: CheckSquare, count: teamTasks.length },
    { key: 'leads', label: 'Leads & CRM', icon: Users, count: leads.length },
    { key: 'workflows', label: 'Process', icon: ShieldCheck, count: workflows.length },
    { key: 'canvas', label: 'Diagram', icon: Network },
    { key: 'links', label: 'Links', icon: Link2, count: workLinks.length },
    { key: 'problems', label: 'Issues', icon: AlertOctagon, count: problems.length },
    { key: 'notes', label: 'Notes', icon: FileText, count: notes.length },
  ];

  const navBar = (
    <div className="flex h-full min-w-0 flex-1 items-stretch gap-2 sm:gap-5">
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

      <button
        type="button"
        onClick={() => setProjectSectionsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={projectSectionsOpen}
        className="my-auto flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-borderSoft/70 bg-panel px-3 text-sm font-semibold text-text-primary sm:hidden"
      >
        <span className="truncate">{activeTab === 'chat' ? 'Chat' : tabs.find((tab) => tab.key === activeTab)?.label ?? 'Project sections'}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
      </button>

      <nav aria-label="Project sections" className="hidden h-full min-w-0 flex-1 items-stretch gap-6 overflow-x-auto scrollbar-none sm:flex">
        {tabs.map(({ key, label, icon: Icon, count }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`${label}${count !== undefined ? `, ${count}` : ''}`}
              title={label}
              className={`group relative flex h-full min-h-[2.25rem] w-auto shrink-0 cursor-pointer items-center justify-start gap-1.5 px-0.5 text-[13px] transition-colors ${
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
      {navSlot ? createPortal(navBar, navSlot) : null}

      {projectSectionsOpen ? createPortal(
        <div className="fixed inset-0 z-[90] sm:hidden" role="dialog" aria-modal="true" aria-label="Project sections">
          <button type="button" className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={() => setProjectSectionsOpen(false)} aria-label="Close project sections" />
          <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+4.25rem)] overflow-hidden rounded-2xl border border-borderSoft bg-panel p-2 shadow-2xl">
            <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Project sections</p>
            <div className="grid grid-cols-2 gap-1">
              {tabs.map(({ key, label, icon: Icon, count }) => {
                const isActive = activeTab === key;
                return (
                  <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors ${isActive ? 'bg-accent/12 font-semibold text-accent' : 'text-text-primary hover:bg-panel2'}`}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {count !== undefined ? <span className="text-[11px] tabular-nums text-text-muted">{count}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {/* The project summary is useful while working in modules, but redundant
          in chat where it steals a large part of a phone viewport. */}
      {activeTab !== 'chat' && activeTab !== 'overview' ? (
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
      ) : activeTab === 'chat' ? (
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-borderSoft/50 px-2 sm:px-3 lg:hidden">
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
      ) : navSlot ? null : (
        <div className="h-12 shrink-0 border-b border-borderSoft/60 px-2">{navBar}</div>
      )}


      {/* Main Tab Content Surface */}
      <div className={`w-full ${activeTab === 'chat' ? 'min-h-0 flex-1 p-2 sm:p-4' : 'p-4 sm:p-6'}`}>
        {activeTab === 'overview' && (
          <ProjectOverview
            mission={mission}
            tasks={teamTasks}
            leads={leads}
            problems={problems}
            onOpenTasks={() => setActiveTab('tasks')}
            onUpdate={isSharedTeamProject ? (updates) => teamState.updateTeamMission(mission.id, updates) : undefined}
            syncStatus={teamState.backendSyncStatus}
            syncError={teamState.backendSyncError}
          />
        )}
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
