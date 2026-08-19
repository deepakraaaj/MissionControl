import { useState, type DragEvent } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  Trash2, 
  UserCheck,
  GripVertical
} from 'lucide-react';
import { useTeamStore } from './team-store';
import { DiscussButton } from './DiscussButton';
import type { TeamRole, TeamTask } from './team-types';

interface TeamTasksViewProps {
  filterMissionId?: string;
}

export function TeamTasksView({ filterMissionId }: TeamTasksViewProps) {
  const teamTasks = useTeamStore((s) => s.teamTasks);
  const teamMissions = useTeamStore((s) => s.teamMissions);
  const addTeamTask = useTeamStore((s) => s.addTeamTask);
  const updateTeamTask = useTeamStore((s) => s.updateTeamTask);
  const toggleTeamTaskDone = useTeamStore((s) => s.toggleTeamTaskDone);
  const deleteTeamTask = useTeamStore((s) => s.deleteTeamTask);
  const activePersona = useTeamStore((s) => s.activePersona);

  const [selectedMissionFilter, setSelectedMissionFilter] = useState<string>(
    filterMissionId || 'all'
  );
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TeamTask['status'] | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOutcome, setNewOutcome] = useState('');
  const [newMissionId, setNewMissionId] = useState(filterMissionId || teamMissions[0]?.id || '');
  const [newRole, setNewRole] = useState<TeamRole>(activePersona.role);
  const [newPriority, setNewPriority] = useState<TeamTask['priority']>('high');
  const [newDueDate, setNewDueDate] = useState('');
  const hasProjects = teamMissions.length > 0;


  const filteredTasks = teamTasks.filter((task) => {
    const matchesMission =
      filterMissionId ? task.missionId === filterMissionId : selectedMissionFilter === 'all' || task.missionId === selectedMissionFilter;
    const matchesRole = roleFilter === 'all' || task.assigneeRole === roleFilter;
    return matchesMission && matchesRole;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMissionId) return;

    addTeamTask({
      missionId: newMissionId,
      title: newTitle.trim(),
      outcome: newOutcome.trim(),
      status: 'backlog',
      priority: newPriority,
      assigneeRole: newRole,
      dueDate: newDueDate || undefined,
    });

    setNewTitle('');
    setNewOutcome('');
    setNewDueDate('');
    setIsAdding(false);
  };

  const getMissionName = (mId: string) => {
    return teamMissions.find((m) => m.id === mId)?.title || 'Project';
  };

  const getPriorityBadge = (priority: TeamTask['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'normal':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const columns: Array<{ status: TeamTask['status']; label: string; tone: string }> = [
    { status: 'backlog', label: 'Backlog', tone: 'bg-slate-400' },
    { status: 'in_progress', label: 'In progress', tone: 'bg-accent' },
    { status: 'review', label: 'Review', tone: 'bg-warning' },
    { status: 'done', label: 'Done', tone: 'bg-success' },
  ];

  const handleDragStart = (event: DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedTaskId(taskId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, status: TeamTask['status']) => {
    event.preventDefault();
    const taskId = draggedTaskId || event.dataTransfer.getData('text/plain');
    if (taskId) {
      updateTeamTask(taskId, {
        status,
        completedAt: status === 'done' ? new Date().toISOString() : undefined,
      });
    }
    setDraggedTaskId(null);
    setDragOverStatus(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Actions Bar */}
      <div className="space-y-3 rounded-2xl border border-borderSoft/30 bg-panel/45 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                Tasks
                <span className="rounded-full bg-panel2/60 px-2 py-0.5 font-mono text-xs text-text-muted">
                  {filteredTasks.length} Tasks
                </span>
              </h3>
              <p className="mt-0.5 text-xs text-text-muted">
                Assign, track, and complete work with your team.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!hasProjects}
            onClick={() => setIsAdding(!isAdding)}
            title={hasProjects ? 'Create task' : 'Create a project from the Mission tab first'}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-[rgb(var(--accent-contrast))] shadow-glow transition-all hover:bg-accentSoft cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New task</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 border-t border-borderSoft/25 pt-2">
          {!filterMissionId && (
            <select
              value={selectedMissionFilter}
              onChange={(e) => setSelectedMissionFilter(e.target.value)}
              className="rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 py-2 text-sm font-medium text-text-primary focus:border-accent focus:outline-none cursor-pointer"
            >
              <option value="all">All projects</option>
              {teamMissions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          )}

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-borderSoft/35 bg-panel2/55 px-3 py-2 text-sm font-medium text-text-primary focus:border-accent focus:outline-none cursor-pointer"
          >
            <option value="all">All Partner Roles</option>
            <option value="Tech Lead">Tech Lead</option>
            <option value="BizDev Partner">BizDev Partner</option>
            <option value="Operations Partner">Operations Partner</option>
          </select>

        </div>
      </div>

      {/* Task Creation Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-2xl border border-accent/35 bg-panel/60 p-4 animate-in fade-in"
        >
          <div className="font-mono text-sm font-bold uppercase tracking-wider text-amber-400">
            Create Team Sprint Task
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Task Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Deploy 2x acrylic QR stands to Indiranagar Arena"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-accent focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Concrete Outcome (Done Definition)</label>
              <input
                type="text"
                placeholder="e.g. Owner verified live QR scanner on desk"
                value={newOutcome}
                onChange={(e) => setNewOutcome(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Project</label>
              <select
                value={newMissionId}
                onChange={(e) => setNewMissionId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
              >
                <option value="" disabled>Select a project</option>
                {teamMissions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Assignee Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as TeamRole)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
              >
                <option value="Tech Lead">Tech Lead</option>
                <option value="BizDev Partner">BizDev Partner</option>
                <option value="Operations Partner">Operations Partner</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TeamTask['priority'])}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Due Date</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-accent hover:bg-accentSoft text-[rgb(var(--accent-contrast))] font-bold text-xs rounded-xl shadow-glow transition-all cursor-pointer"
            >
              Save Team Task
            </button>
          </div>
        </form>
      )}

      {/* Kanban board */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-borderSoft/30 bg-panel/30 p-12 text-center">
          <CheckSquare className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-text-primary">No Team Tasks Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Create a task and assign it to the right person.
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-2 px-1 text-xs text-text-muted xl:hidden">
            Swipe between columns · use Previous or Next to move cards
          </p>
          <div className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-3 scrollbar-none xl:grid xl:grid-cols-4 xl:overflow-visible xl:pb-0">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter((task) => task.status === column.status);
            const isDropTarget = dragOverStatus === column.status;
            return (
              <div
                key={column.status}
                onDragEnter={() => setDragOverStatus(column.status)}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverStatus(null);
                }}
                onDrop={(event) => handleDrop(event, column.status)}
                className={`min-h-[calc(100dvh-18rem)] w-[calc(100vw-3rem)] max-w-[380px] shrink-0 snap-start rounded-2xl border p-2.5 transition-colors sm:w-[380px] xl:min-h-[360px] xl:w-auto xl:max-w-none ${
                  isDropTarget
                    ? 'border-accent/55 bg-accent/8'
                    : 'border-borderSoft/30 bg-panel/25'
                }`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${column.tone}`} />
                    <h4 className="text-sm font-semibold text-text-primary">{column.label}</h4>
                  </div>
                  <span className="rounded-full bg-panel2/60 px-2 py-0.5 text-xs text-text-muted">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {columnTasks.map((task) => {
                    const isDone = task.status === 'done';
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, task.id)}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverStatus(null);
                        }}
                        className={`group rounded-xl border border-borderSoft/35 bg-panel p-4 shadow-sm transition-all hover:border-borderSoft/60 hover:shadow-md ${
                          draggedTaskId === task.id ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 hidden h-4 w-4 shrink-0 cursor-grab text-text-muted/55 active:cursor-grabbing xl:block" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-semibold leading-snug ${isDone ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                                {task.title}
                              </p>
                              <DiscussButton
                                className="shrink-0 p-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100"
                                item={{ kind: 'task', id: task.id, label: task.title, detail: task.status }}
                              />
                              <button
                                type="button"
                                onClick={() => deleteTeamTask(task.id)}
                                className="shrink-0 rounded-md p-1 text-text-muted opacity-100 transition hover:bg-rose-500/10 hover:text-rose-500 xl:opacity-0 xl:group-hover:opacity-100"
                                title="Delete task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${getPriorityBadge(task.priority)}`}>
                                {task.priority}
                              </span>
                              {!filterMissionId && (
                                <span className="max-w-full truncate rounded-full bg-panel2/60 px-2 py-0.5 text-[11px] text-text-secondary">
                                  {getMissionName(task.missionId)}
                                </span>
                              )}
                            </div>

                            {task.outcome && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-muted">{task.outcome}</p>}

                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-borderSoft/20 pt-2.5 text-[11px] text-text-muted">
                              <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{task.assigneeRole}</span>
                              {task.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{task.dueDate}</span>}
                              <div className="mt-1 grid w-full grid-cols-2 gap-2 xl:hidden">
                                <button
                                  type="button"
                                  disabled={column.status === columns[0].status}
                                  onClick={() => {
                                    const index = columns.findIndex((item) => item.status === column.status);
                                    const status = columns[index - 1]?.status;
                                    if (status) updateTeamTask(task.id, { status, completedAt: undefined });
                                  }}
                                  className="rounded-lg border border-borderSoft/35 bg-panel2/45 px-2 py-2 text-xs font-medium text-text-secondary disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  ← Previous
                                </button>
                                <button
                                  type="button"
                                  disabled={column.status === columns[columns.length - 1].status}
                                  onClick={() => {
                                    const index = columns.findIndex((item) => item.status === column.status);
                                    const status = columns[index + 1]?.status;
                                    if (status) updateTeamTask(task.id, {
                                      status,
                                      completedAt: status === 'done' ? new Date().toISOString() : undefined,
                                    });
                                  }}
                                  className="rounded-lg border border-borderSoft/35 bg-panel2/45 px-2 py-2 text-xs font-medium text-text-secondary disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  Next →
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleTeamTaskDone(task.id)}
                                className="ml-auto text-emerald-500 hover:text-emerald-400"
                              >
                                {isDone ? 'Reopen' : 'Done'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-borderSoft/30 text-xs text-text-muted">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
