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
