export type TeamRole = 'Tech Lead' | 'BizDev Partner' | 'Operations Partner' | 'General Member';

export interface TeamPersona {
  id: string;
  name: string;
  role: TeamRole;
  initials: string;
  color: string;
  email?: string;
  phone?: string;
}

export type LeadCategory = 'Turf' | 'Gym' | 'Retail' | 'Seasonal' | 'Other';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'meeting_set'
  | 'active_pilot'
  | 'paid_client'
  | 'lost';

export interface Lead {
  id: string;
  missionId: string;
  businessName: string;
  category: LeadCategory;
  ownerName: string;
  phone: string;
  location: string;
  locationUrl?: string;
  status: LeadStatus;
  notes: string;
  nextFollowUp?: string;
  pilotStartDate?: string;
  pilotEndDate?: string;
  monthlyValue?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SOPStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  requiredProof?: string;
}

export interface WorkflowSOP {
  id: string;
  missionId: string;
  title: string;
  description: string;
  targetOutcome: string;
  steps: SOPStep[];
  status: 'draft' | 'in_progress' | 'completed';
}

export type WorkLinkCategory = 'demo' | 'repo' | 'design' | 'doc' | 'drive';

export interface WorkLink {
  id: string;
  missionId: string;
  title: string;
  url: string;
  category: WorkLinkCategory;
  description?: string;
  addedBy?: string;
  createdAt: string;
}

export type ProblemSeverity = 'blocker' | 'friction' | 'idea';
export type ProblemStatus = 'open' | 'investigating' | 'solved';

export interface ProblemItem {
  id: string;
  missionId: string;
  audienceCategory: string;
  title: string;
  description: string;
  source: string;
  severity: ProblemSeverity;
  status: ProblemStatus;
  tags: string[];
  loggedBy: string;
  createdAt: string;
  solvedNotes?: string;
  /** Verbatim signal, metric, screenshot reference, or repeated observation. */
  evidence?: string;
  /** Business or user consequence if this remains unresolved. */
  impact?: string;
  /** Smallest action that can validate or reduce the problem. */
  nextAction?: string;
  owner?: string;
  dueDate?: string;
  occurrenceCount?: number;
}

export interface DiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  type: 'actor' | 'process' | 'system' | 'database' | 'action';
  x: number;
  y: number;
  color?: string;
  icon?: string;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface VisualDiagram {
  id: string;
  missionId: string;
  title: string;
  description: string;
  diagramType: 'user_journey' | 'system_arch' | 'payment_flow' | 'custom';
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  updatedAt: string;
}

export interface TeamNote {
  id: string;
  missionId: string;
  title: string;
  content: string;
  category: 'Playbook' | 'Meeting' | 'Field Intel' | 'Strategy' | 'General';
  pinned?: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamTask {
  id: string;
  missionId: string;
  title: string;
  outcome?: string;
  status: 'backlog' | 'in_progress' | 'review' | 'done';
  priority: 'critical' | 'high' | 'normal' | 'low';
  assigneeRole: TeamRole;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

/** Any module item a chat message can point at. */
export type ChatRefKind = 'task' | 'lead' | 'workflow' | 'link' | 'problem' | 'note';

export interface ChatRef {
  kind: ChatRefKind;
  id: string;
  label: string;
  detail?: string;
}

export interface ChatReaction {
  emoji: string;
  /** Persona names that reacted, so the tooltip can name them. */
  by: string[];
}

export interface TeamChatMessage {
  id: string;
  missionId: string;
  /** 'system' rows are written by the modules themselves, not by a person. */
  kind: 'message' | 'system';
  authorName: string;
  body: string;
  refs: ChatRef[];
  reactions: ChatReaction[];
  /** Set on replies; the id of the message that opened the thread. */
  parentId?: string;
  /** Persona names @mentioned in the body. */
  mentions: string[];
  createdAt: string;
  editedAt?: string;
  /** Item that was created out of this message, if any. */
  spawned?: ChatRef;
}

/**
 * A project inside a team room — the unit every other module hangs off via
 * `missionId`. Persisted relationally as `public.team_projects`.
 */
export interface TeamMissionItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  color: string;
  objective: string;
  why_it_matters: string;
  definition_of_success: string;
  customer_segment?: string;
  revenue_model?: string;
  status: 'active' | 'on_hold' | 'completed';
  is_pinned: boolean;
  target_date: string;
  tags: string[];
  /** Auth user IDs explicitly attached to this project. */
  member_ids?: string[];
}

/** Every collection that makes up one room's shared workspace. */
export interface TeamWorkspaceData {
  teamMissions: TeamMissionItem[];
  leads: Lead[];
  workflows: WorkflowSOP[];
  workLinks: WorkLink[];
  problems: ProblemItem[];
  diagrams: VisualDiagram[];
  teamNotes: TeamNote[];
  teamTasks: TeamTask[];
  chatMessages: TeamChatMessage[];
}
