import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  TeamPersona,
  Lead,
  WorkflowSOP,
  WorkLink,
  ProblemItem,
  VisualDiagram,
  LeadStatus,
  ProblemSeverity,
  TeamNote,
  TeamTask,
  DiagramNode,
} from './team-types';
import {
  INITIAL_PERSONAS,
  INITIAL_TEAM_MISSIONS,
  INITIAL_LEADS,
  INITIAL_WORKFLOWS,
  INITIAL_WORK_LINKS,
  INITIAL_PROBLEMS,
  INITIAL_DIAGRAMS,
  INITIAL_TEAM_NOTES,
  INITIAL_TEAM_TASKS,
  type TeamMissionItem,
} from './team-seed';

interface TeamState {
  workspaceMode: 'personal' | 'team';
  teamUnlocked: boolean;
  activePersona: TeamPersona;
  teamMissions: TeamMissionItem[];
  selectedTeamMissionId: string | null;
  leads: Lead[];
  workflows: WorkflowSOP[];
  workLinks: WorkLink[];
  problems: ProblemItem[];
  diagrams: VisualDiagram[];
  teamNotes: TeamNote[];
  teamTasks: TeamTask[];

  // Auth & Workspace Switching
  setWorkspaceMode: (mode: 'personal' | 'team') => void;
  grantApprovedTeamAccess: () => void;
  lockTeam: () => void;
  setAuthenticatedPersona: (persona: TeamPersona) => void;
  selectTeamMission: (missionId: string | null) => void;

  // Team Missions Actions
  addTeamMission: (mission: Omit<TeamMissionItem, 'id'>) => TeamMissionItem;
  updateTeamMission: (id: string, updates: Partial<TeamMissionItem>) => void;
  deleteTeamMission: (id: string) => void;

  // Leads CRM Actions
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Lead;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  updateLeadStatus: (id: string, status: LeadStatus) => void;

  // Workflows & SOP Actions
  toggleSOPStep: (sopId: string, stepId: string) => void;
  addWorkflow: (workflow: Omit<WorkflowSOP, 'id'>) => void;

  // Work Links Actions
  addWorkLink: (link: Omit<WorkLink, 'id' | 'createdAt'>) => void;
  deleteWorkLink: (id: string) => void;

  // MDM Problem Bank Actions
  addProblem: (problem: Omit<ProblemItem, 'id' | 'createdAt'>) => ProblemItem;
  updateProblemStatus: (id: string, status: 'open' | 'investigating' | 'solved') => void;
  deleteProblem: (id: string) => void;

  // Visual Diagrams Actions
  addDiagram: (diagram: Omit<VisualDiagram, 'id' | 'updatedAt'>) => VisualDiagram;
  updateDiagram: (id: string, updates: Partial<Omit<VisualDiagram, 'id' | 'missionId'>>) => void;
  deleteDiagram: (id: string) => void;
  updateDiagramNodes: (diagramId: string, nodes: DiagramNode[]) => void;

  // Team Notes Actions
  addTeamNote: (note: Omit<TeamNote, 'id' | 'createdAt' | 'updatedAt'>) => TeamNote;
  updateTeamNote: (id: string, updates: Partial<TeamNote>) => void;
  deleteTeamNote: (id: string) => void;

  // Team Tasks Actions
  addTeamTask: (task: Omit<TeamTask, 'id' | 'createdAt'>) => TeamTask;
  updateTeamTask: (id: string, updates: Partial<TeamTask>) => void;
  toggleTeamTaskDone: (id: string) => void;
  deleteTeamTask: (id: string) => void;

  // Fast Pocket Drops
  pocketDropLead: (data: {
    missionId: string;
    businessName: string;
    ownerName: string;
    phone: string;
    notes: string;
    category?: Lead['category'];
  }) => Lead;

  pocketDropProblem: (data: {
    missionId: string;
    title: string;
    description: string;
    source: string;
    severity: ProblemSeverity;
    audienceCategory?: string;
  }) => ProblemItem;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      workspaceMode: 'personal',
      teamUnlocked: false,
      activePersona: INITIAL_PERSONAS[0],
      teamMissions: INITIAL_TEAM_MISSIONS,
      selectedTeamMissionId: INITIAL_TEAM_MISSIONS[0]?.id ?? null,
      leads: INITIAL_LEADS,
      workflows: INITIAL_WORKFLOWS,
      workLinks: INITIAL_WORK_LINKS,
      problems: INITIAL_PROBLEMS,
      diagrams: INITIAL_DIAGRAMS,
      teamNotes: INITIAL_TEAM_NOTES,
      teamTasks: INITIAL_TEAM_TASKS,

      setWorkspaceMode: (mode) => set({ workspaceMode: mode }),

      lockTeam: () => set({ teamUnlocked: false, workspaceMode: 'personal' }),

      grantApprovedTeamAccess: () => set({ teamUnlocked: true, workspaceMode: 'team' }),

      setAuthenticatedPersona: (persona) => set({ activePersona: persona }),

      selectTeamMission: (missionId) => set({ selectedTeamMissionId: missionId }),

      // Team Missions
      addTeamMission: (missionData) => {
        const newMission: TeamMissionItem = {
          ...missionData,
          id: `m-${Date.now()}`,
        };
        set((state) => ({ teamMissions: [newMission, ...state.teamMissions] }));
        return newMission;
      },

      updateTeamMission: (id, updates) => {
        set((state) => ({
          teamMissions: state.teamMissions.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));
      },

      deleteTeamMission: (id) => {
        set((state) => ({
          teamMissions: state.teamMissions.filter((m) => m.id !== id),
          selectedTeamMissionId:
            state.selectedTeamMissionId === id ? null : state.selectedTeamMissionId,
        }));
      },

      // Leads
      addLead: (leadData) => {
        const newLead: Lead = {
          ...leadData,
          id: `lead-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ leads: [newLead, ...state.leads] }));
        return newLead;
      },

      updateLead: (id, updates) => {
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
          ),
        }));
      },

      deleteLead: (id) => {
        set((state) => ({
          leads: state.leads.filter((l) => l.id !== id),
        }));
      },

      updateLeadStatus: (id, status) => {
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l
          ),
        }));
      },

      // Workflows & SOPs
      toggleSOPStep: (sopId, stepId) => {
        const currentPersona = get().activePersona;
        set((state) => ({
          workflows: state.workflows.map((wf) => {
            if (wf.id !== sopId) return wf;
            const updatedSteps = wf.steps.map((step) => {
              if (step.id !== stepId) return step;
              const willBeCompleted = !step.completed;
              return {
                ...step,
                completed: willBeCompleted,
                completedAt: willBeCompleted ? new Date().toISOString().split('T')[0] : undefined,
                completedBy: willBeCompleted ? currentPersona.name : undefined,
              };
            });
            const allDone = updatedSteps.every((s) => s.completed);
            return {
              ...wf,
              steps: updatedSteps,
              status: allDone ? 'completed' : 'in_progress',
            };
          }),
        }));
      },

      addWorkflow: (wfData) => {
        const newWf: WorkflowSOP = {
          ...wfData,
          id: `sop-${Date.now()}`,
        };
        set((state) => ({ workflows: [...state.workflows, newWf] }));
      },

      // Work Links
      addWorkLink: (linkData) => {
        const newLink: WorkLink = {
          ...linkData,
          id: `wl-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ workLinks: [newLink, ...state.workLinks] }));
      },

      deleteWorkLink: (id) => {
        set((state) => ({
          workLinks: state.workLinks.filter((w) => w.id !== id),
        }));
      },

      // Problems / Friction
      addProblem: (probData) => {
        const newProb: ProblemItem = {
          ...probData,
          id: `prob-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ problems: [newProb, ...state.problems] }));
        return newProb;
      },

      updateProblemStatus: (id, status) => {
        set((state) => ({
          problems: state.problems.map((p) => (p.id === id ? { ...p, status } : p)),
        }));
      },

      deleteProblem: (id) => {
        set((state) => ({
          problems: state.problems.filter((p) => p.id !== id),
        }));
      },

      // Visual Diagrams
      addDiagram: (diagramData) => {
        const diagram: VisualDiagram = {
          ...diagramData,
          id: `diagram-${Date.now()}`,
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ diagrams: [diagram, ...state.diagrams] }));
        return diagram;
      },

      updateDiagram: (id, updates) => {
        set((state) => ({
          diagrams: state.diagrams.map((diagram) =>
            diagram.id === id ? { ...diagram, ...updates, updatedAt: new Date().toISOString() } : diagram
          ),
        }));
      },

      deleteDiagram: (id) => {
        set((state) => ({ diagrams: state.diagrams.filter((diagram) => diagram.id !== id) }));
      },

      updateDiagramNodes: (diagramId, nodes) => {
        set((state) => ({
          diagrams: state.diagrams.map((d) =>
            d.id === diagramId ? { ...d, nodes, updatedAt: new Date().toISOString() } : d
          ),
        }));
      },

      // Team Notes
      addTeamNote: (noteData) => {
        const newNote: TeamNote = {
          ...noteData,
          id: `tn-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ teamNotes: [newNote, ...state.teamNotes] }));
        return newNote;
      },

      updateTeamNote: (id, updates) => {
        set((state) => ({
          teamNotes: state.teamNotes.map((n) =>
            n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
          ),
        }));
      },

      deleteTeamNote: (id) => {
        set((state) => ({
          teamNotes: state.teamNotes.filter((n) => n.id !== id),
        }));
      },

      // Team Tasks
      addTeamTask: (taskData) => {
        const newTask: TeamTask = {
          ...taskData,
          id: `tt-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ teamTasks: [newTask, ...state.teamTasks] }));
        return newTask;
      },

      updateTeamTask: (id, updates) => {
        set((state) => ({
          teamTasks: state.teamTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      toggleTeamTaskDone: (id) => {
        set((state) => ({
          teamTasks: state.teamTasks.map((t) => {
            if (t.id !== id) return t;
            const isDone = t.status === 'done';
            return {
              ...t,
              status: isDone ? 'in_progress' : 'done',
              completedAt: isDone ? undefined : new Date().toISOString(),
            };
          }),
        }));
      },

      deleteTeamTask: (id) => {
        set((state) => ({
          teamTasks: state.teamTasks.filter((t) => t.id !== id),
        }));
      },

      // Fast Drops
      pocketDropLead: ({ missionId, businessName, ownerName, phone, notes, category = 'Turf' }) => {
        const persona = get().activePersona;
        const newLead: Lead = {
          id: `lead-${Date.now()}`,
          missionId,
          businessName,
          category,
          ownerName: ownerName || 'Owner/Manager',
          phone,
          location: 'Field Visit',
          status: 'contacted',
          notes,
          nextFollowUp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdBy: persona.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ leads: [newLead, ...state.leads] }));
        return newLead;
      },

      pocketDropProblem: ({
        missionId,
        title,
        description,
        source,
        severity,
        audienceCategory = 'Venue Owner',
      }) => {
        const persona = get().activePersona;
        const newProb: ProblemItem = {
          id: `prob-${Date.now()}`,
          missionId,
          audienceCategory,
          title,
          description: description || title,
          source: source || persona.name,
          severity,
          status: 'open',
          tags: [severity, 'Field-Drop'],
          loggedBy: persona.name,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ problems: [newProb, ...state.problems] }));
        return newProb;
      },
    }),
    {
      name: 'syncatch-team-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        workspaceMode: state.workspaceMode,
        activePersona: state.activePersona,
        teamMissions: state.teamMissions,
        selectedTeamMissionId: state.selectedTeamMissionId,
        leads: state.leads,
        workflows: state.workflows,
        workLinks: state.workLinks,
        problems: state.problems,
        diagrams: state.diagrams,
        teamNotes: state.teamNotes,
        teamTasks: state.teamTasks,
      }),
    }
  )
);
