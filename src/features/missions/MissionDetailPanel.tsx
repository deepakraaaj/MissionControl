import { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MissionIcon } from '../../components/ui/mission-icon';
import { cn } from '../../lib/cn';
import { useMissionStore } from './mission-store';
import { useTaskStore } from '../tasks/task-store';
import type { Mission, MissionColor } from './mission-types';
import type { Task, TaskLane, TaskPriority } from '../tasks/task-types';
import { 
  Trash2, Plus, Pencil, Pause, Play, CheckCircle, RotateCcw, X, 
  CheckSquare, Square, ChevronRight, Clock, Target, Calendar, Pin, FileText, Flame, Trophy
} from 'lucide-react';
import { useNoteStore } from '../notes/note-store';
import { getCategoryById, NoteCategoryIcon, getNoteColorStyle, getNoteDisplayTitle } from '../notes/note-helpers';
import { lazyWithReload } from '../../lib/lazy-with-reload';
const NoteEditorModal = lazyWithReload('note-editor', () => import('../notes/NotesView').then((m) => ({ default: m.NoteEditorModal })));
import { RichTextContent } from '../../components/ui/rich-text-content';
import { confirmDialog } from '../../components/ui/native-dialog';
import type { Note } from '../notes/note-types';
import { AssigneeSelect } from '../collaborators/AssigneeSelect';
import { getChallengeStreak, useChallengeStore } from '../challenges/challenge-store';

interface MissionDetailPanelProps {
  mission: Mission;
  allTasks: Task[];
  onClose: () => void;
  onOpenTask: (taskId: string) => void;
  onEditMission: (mission: Mission) => void;
}

const LANE_OPTIONS: { id: TaskLane; label: string; colorClass: string }[] = [
  { id: 'now', label: 'Active', colorClass: 'bg-accent text-accent' },
  { id: 'next', label: 'Next', colorClass: 'bg-indigo-500 text-indigo-400' },
  { id: 'inbox', label: 'Queue', colorClass: 'bg-warning text-warning' },
  { id: 'later', label: 'Later', colorClass: 'bg-text-muted/40 text-text-muted' },
  { id: 'done', label: 'Completed', colorClass: 'bg-success text-success' },
];

const COLOR_THEMES: Record<MissionColor, { border: string; soft: string; text: string; fill: string }> = {
  red: {
    border: 'border-red-500/26',
    soft: 'bg-red-500/10',
    text: 'text-red-400',
    fill: 'bg-red-500',
  },
  orange: {
    border: 'border-orange-500/26',
    soft: 'bg-orange-500/10',
    text: 'text-orange-400',
    fill: 'bg-orange-500',
  },
  yellow: {
    border: 'border-yellow-500/26',
    soft: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    fill: 'bg-yellow-500',
  },
  green: {
    border: 'border-green-500/26',
    soft: 'bg-green-500/10',
    text: 'text-green-400',
    fill: 'bg-green-500',
  },
  teal: {
    border: 'border-teal-500/26',
    soft: 'bg-teal-500/10',
    text: 'text-teal-400',
    fill: 'bg-teal-500',
  },
  blue: {
    border: 'border-blue-500/26',
    soft: 'bg-blue-500/10',
    text: 'text-blue-400',
    fill: 'bg-blue-500',
  },
  purple: {
    border: 'border-purple-500/26',
    soft: 'bg-purple-500/10',
    text: 'text-purple-400',
    fill: 'bg-purple-500',
  },
  pink: {
    border: 'border-pink-500/26',
    soft: 'bg-pink-500/10',
    text: 'text-pink-400',
    fill: 'bg-pink-500',
  },
  gray: {
    border: 'border-slate-500/26',
    soft: 'bg-slate-500/10',
    text: 'text-slate-400',
    fill: 'bg-slate-500',
  },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.28em] text-text-muted">{children}</p>
  );
}

export function MissionDetailPanel({
  mission,
  allTasks,
  onClose,
  onOpenTask,
  onEditMission,
}: MissionDetailPanelProps) {
  const setMissionStatus = useMissionStore((s) => s.setMissionStatus);
  const deleteMission = useMissionStore((s) => s.deleteMission);

  const createTask = useTaskStore((s) => s.createTask);
  const moveTaskToLane = useTaskStore((s) => s.moveTaskToLane);
  const markDone = useTaskStore((s) => s.markDone);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [addingTask, setAddingTask] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [showTaskOptions, setShowTaskOptions] = useState(false);

  // Notes integration hooks and state
  const notes = useNoteStore((s) => s.notes);
  const categories = useNoteStore((s) => s.categories);
  const hydrateNotes = useNoteStore((s) => s.hydrate);
  const createNote = useNoteStore((s) => s.createNote);
  const updateNote = useNoteStore((s) => s.updateNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const togglePin = useNoteStore((s) => s.togglePin);
  const missions = useMissionStore((s) => s.missions);
  const challenges = useChallengeStore((s) => s.challenges);
  const toggleChallengeToday = useChallengeStore((s) => s.toggleToday);

  const [noteEditorState, setNoteEditorState] = useState<{ mode: 'create' | 'edit'; note?: Note } | null>(null);

  useEffect(() => {
    void hydrateNotes();
  }, [hydrateNotes]);

  const missionNotes = useMemo(() => {
    return notes.filter((n: Note) => n.mission_id === mission.id);
  }, [notes, mission.id]);

  // Filter tasks associated with this mission
  const missionTasks = useMemo(() => {
    return allTasks.filter((t: Task) => t.mission_id === mission.id && t.parent_task_id === null);
  }, [allTasks, mission.id]);
  const missionChallenges = useMemo(() => challenges.filter((challenge) => challenge.missionId === mission.id), [challenges, mission.id]);

  const stats = useMemo(() => {
    const total = missionTasks.length;
    const done = missionTasks.filter((t: Task) => t.lane === 'done').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, progress };
  }, [missionTasks]);

  const theme = COLOR_THEMES[mission.color] || COLOR_THEMES.blue;

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || addingTask) return;

    setAddingTask(true);
    try {
      await createTask({
        title,
        mission_id: mission.id,
        lane: 'inbox',
        status: 'captured',
        priority: 'normal',
        energy: 'shallow',
        assignee_ids: newTaskAssignees,
      });
      setNewTaskTitle('');
      setNewTaskAssignees([]);
    } finally {
      setAddingTask(false);
    }
  }

  async function handleDeleteMission() {
    if (confirmDelete) {
      await deleteMission(mission.id);
      onClose();
    } else {
      setConfirmDelete(true);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-panel">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-borderSoft/20 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border text-xl', theme.border, theme.soft, theme.text)}
          >
            <MissionIcon icon={mission.emoji} className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-text-muted/70">Mission</p>
            <h3 className="mt-0.5 truncate text-[17px] font-semibold tracking-tight text-text-primary">
              {mission.title}
            </h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-borderSoft/30 bg-panel2/25 text-text-muted transition-colors hover:border-borderSoft/50 hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body — scrollable */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-panel2/10 px-5 py-5 sm:px-6">
        {/* Mission Stats / Progress */}
        <div className={cn('relative overflow-hidden rounded-[22px] border p-4', theme.border, theme.soft)}>
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-current opacity-[0.04] blur-2xl" />
          <div className="relative flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted/70">Progress</p><p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{stats.progress}%</p></div>
            <div className="text-right"><Badge tone={mission.status === 'active' ? 'accent' : mission.status === 'completed' ? 'success' : 'neutral'}>{mission.status === 'on_hold' ? 'On hold' : mission.status.charAt(0).toUpperCase() + mission.status.slice(1)}</Badge><p className="mt-2 text-[10px] text-text-muted">{stats.done} of {stats.total} tasks complete</p></div>
          </div>
          <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-text-primary/8">
            <div
              className={cn('h-full rounded-full transition-all duration-300', theme.fill)}
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <div className="relative mt-3 flex flex-wrap items-center justify-end gap-2 text-[10px] text-text-muted">
            {mission.target_date ? (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Target: {new Date(mission.target_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            ) : null}
          </div>
        </div>

        {/* Objective & Metadata accordion */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div><FieldLabel>Clarity & Context</FieldLabel><p className="mt-1 text-[11px] text-text-muted/70">Why this mission matters</p></div>
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="text-xs text-accent hover:underline"
            >
              {showMetadata ? 'Hide details' : 'Show details'}
            </button>
          </div>

          {showMetadata && (
            <div className="space-y-4 rounded-[18px] border border-borderSoft/24 bg-panel/45 p-4 text-sm">
              {mission.objective ? (
                <div className="space-y-1">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-text-muted">Objective</p>
                  <p className="text-text-primary leading-relaxed">{mission.objective}</p>
                </div>
              ) : null}

              {mission.description ? (
                <div className="space-y-1">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-text-muted">Description</p>
                  <p className="text-text-secondary leading-relaxed">{mission.description}</p>
                </div>
              ) : null}

              {mission.notes ? (
                <div className="space-y-1">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-text-muted">Notes</p>
                  <p className="text-text-secondary whitespace-pre-line leading-relaxed">{mission.notes}</p>
                </div>
              ) : null}

              {!mission.objective && !mission.description && !mission.notes ? (
                <p className="text-text-muted italic text-center py-2">No clarity notes set for this mission yet.</p>
              ) : null}

              {mission.estimated_hours ? (
                <div className="flex items-center gap-2 border-t border-borderSoft/20 pt-3 text-xs text-text-muted">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Estimated: <strong className="text-text-secondary">{mission.estimated_hours} hours</strong> of effort</span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Task list section */}
        <div className="space-y-3">
          <div className="flex items-end justify-between"><div><FieldLabel>Tasks in Mission</FieldLabel><p className="mt-1 text-[11px] text-text-muted/70">{stats.total} total · {stats.total - stats.done} remaining</p></div></div>

          {/* Quick task addition */}
          <form onSubmit={(e) => void handleAddTask(e)} className="rounded-[18px] border border-borderSoft/24 bg-panel/45 p-2.5">
            <div className="flex items-center gap-2">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add new task to this mission..."
                className="h-10 flex-1 border-transparent bg-transparent text-sm shadow-none focus:border-borderSoft/30 rounded-[12px]"
              />
              <Button size="sm" type="submit" disabled={!newTaskTitle.trim() || addingTask} className="h-9 w-9 rounded-[12px] p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <button type="button" onClick={() => setShowTaskOptions((value) => !value)} className="ml-1 mt-1 text-[10px] font-medium text-text-muted transition-colors hover:text-text-secondary">{showTaskOptions ? 'Hide assignment' : '+ Assign this task'}</button>
            {showTaskOptions ? <div className="mt-2"><AssigneeSelect value={newTaskAssignees} onChange={setNewTaskAssignees} /></div> : null}
          </form>

          {/* Grouped tasks */}
          <div className="space-y-4 pt-1">
            {LANE_OPTIONS.map((lane) => {
              const laneTasks = missionTasks.filter((t: Task) => {
                if (lane.id === 'done') return t.lane === 'done' || t.status === 'done';
                return t.lane === lane.id && t.status !== 'done';
              });

              if (laneTasks.length === 0) return null;

              return (
                <div key={lane.id} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className={cn('h-1.5 w-1.5 rounded-full', lane.id === 'done' ? 'bg-success' : lane.id === 'now' ? 'bg-accent' : lane.id === 'next' ? 'bg-indigo-500' : lane.id === 'inbox' ? 'bg-warning' : 'bg-text-muted')} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      {lane.label} ({laneTasks.length})
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {laneTasks.map((task: Task) => {
                      const isCompleted = task.lane === 'done' || task.status === 'done';

                      return (
                        <div
                          key={task.id}
                          className="group flex cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-borderSoft/22 bg-panel/45 px-3 py-3 transition-all hover:border-borderSoft/40 hover:bg-panel/70"
                          onClick={() => onOpenTask(task.id)}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isCompleted) {
                                  void moveTaskToLane(task.id, 'inbox');
                                } else {
                                  void markDone(task.id);
                                }
                              }}
                              className="text-text-muted hover:text-accent shrink-0 transition-colors"
                            >
                              {isCompleted ? (
                                <CheckSquare className="h-4.5 w-4.5 text-success" />
                              ) : (
                                <Square className="h-4.5 w-4.5" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <span className={cn('block text-sm truncate', isCompleted ? 'text-text-muted line-through' : 'text-text-primary font-medium')}>
                                {task.title}
                              </span>
                              {task.due_date && !isCompleted && (
                                <span className="text-[10px] text-warning flex items-center gap-1 mt-0.5">
                                  <Calendar className="h-3 w-3" /> Due {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Lane selector dropdown */}
                            <select
                              value={task.lane}
                              onChange={(e) => void moveTaskToLane(task.id, e.target.value as TaskLane)}
                              className="max-w-[82px] rounded-lg border border-borderSoft/25 bg-panel2/30 px-1.5 py-1 text-[10px] font-medium text-text-secondary outline-none hover:border-accent/40"
                            >
                              {LANE_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={async () => {
                                if (await confirmDialog(`Delete task “${task.title}”?`, { title: 'Delete task', confirmLabel: 'Delete', danger: true })) {
                                  void deleteTask(task.id);
                                }
                              }}
                              className="rounded p-1 text-text-muted hover:bg-warning/10 hover:text-warning"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {missionTasks.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-borderSoft/30 bg-panel/25 p-5 text-center">
                <Target className="mx-auto h-8 w-8 text-text-muted/65" />
                <p className="mt-2 text-sm font-semibold text-text-primary">No tasks in this mission yet</p>
                <p className="mt-1 text-xs text-text-muted">Create a task above to start making progress.</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Daily challenges supporting this mission */}
        {missionChallenges.length > 0 ? (
          <div className="space-y-3 pt-2">
            <FieldLabel>Daily Challenges ({missionChallenges.length})</FieldLabel>
            <div className="space-y-2">
              {missionChallenges.map((challenge) => {
                const today = new Date().toLocaleDateString('en-CA');
                const completed = challenge.checkIns.includes(today);
                return (
                  <div key={challenge.id} className="flex items-center gap-3 rounded-[16px] border border-borderSoft/30 bg-panel/45 p-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-panel2/60 text-lg">{challenge.emoji}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-text-primary">{challenge.title}</p><p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-secondary"><Flame className="h-3 w-3 text-warning" />{getChallengeStreak(challenge.checkIns)} day streak</p></div>
                    <button onClick={() => toggleChallengeToday(challenge.id)} className={cn('flex h-9 w-9 items-center justify-center rounded-full border transition-colors', completed ? 'border-success/40 bg-success/18 text-success' : 'border-borderSoft/40 text-text-muted hover:border-accent/45 hover:text-accent')} aria-label={completed ? 'Undo today check-in' : 'Check in today'}>{completed ? <CheckSquare className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}</button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Associated Notes Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <FieldLabel>Notes in Mission ({missionNotes.length})</FieldLabel>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNoteEditorState({ mode: 'create' })}
              className="h-7 text-xs text-accent rounded-[12px] px-2 hover:bg-accent/10"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Note
            </Button>
          </div>

          <div className="space-y-3">
            {missionNotes.map((note) => {
              const category = getCategoryById(note.category_id, categories);
              const noteStyle = getNoteColorStyle(category.color);
              const noteTitle = getNoteDisplayTitle(note);

              return (
                <div
                  key={note.id}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border bg-panel/35 p-4 hover:bg-panel2/40 transition-colors cursor-pointer',
                    noteStyle.border
                  )}
                  onClick={() => setNoteEditorState({ mode: 'edit', note })}
                >
                  <div className={cn('absolute inset-x-0 top-0 h-1', noteStyle.solid)} />
                  <div className="flex items-start justify-between gap-2 mb-2 pt-1">
                    <Badge tone="neutral" className={cn('gap-1 text-[9px] font-medium px-2 py-0.5 normal-case border', noteStyle.bg, noteStyle.border, noteStyle.text)}>
                      <NoteCategoryIcon icon={category.icon} className="h-2.5 w-2.5" />
                      {category.label}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => void togglePin(note.id)}
                        className={cn('p-1 text-text-muted hover:text-accent rounded hover:bg-panel2/50 transition-colors', note.pinned && 'text-accent')}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (await confirmDialog('Delete this note?', { title: 'Delete note', confirmLabel: 'Delete', danger: true })) {
                            void deleteNote(note.id);
                          }
                        }}
                        className="p-1 text-text-muted hover:text-warning rounded hover:bg-panel2/50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-text-primary mb-1">
                    {noteTitle}
                  </h4>

                  {note.content.trim() ? (
                    <RichTextContent
                      content={note.content}
                      className="text-[13px] text-text-secondary line-clamp-3 leading-relaxed"
                    />
                  ) : (
                    <p className="text-xs text-text-muted italic">Empty note</p>
                  )}
                </div>
              );
            })}

            {missionNotes.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-borderSoft/30 bg-panel/25 p-5 text-center">
                <FileText className="mx-auto h-7 w-7 text-text-muted/65" />
                <p className="mt-2 text-xs font-semibold text-text-primary">No notes linked to this mission</p>
                <p className="mt-1 text-[11px] text-text-muted">Create a note to capture logs, context, or links.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer / Mission Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borderSoft/20 bg-panel px-5 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {mission.status === 'active' ? (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs h-8"
              onClick={() => void setMissionStatus(mission.id, 'on_hold')}
            >
              <Pause className="h-3.5 w-3.5 mr-1" /> Pause
            </Button>
          ) : mission.status === 'on_hold' ? (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs h-8"
              onClick={() => void setMissionStatus(mission.id, 'active')}
            >
              <Play className="h-3.5 w-3.5 mr-1 text-accent" /> Resume
            </Button>
          ) : null}

          {mission.status !== 'completed' ? (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs h-8 text-success hover:bg-success/10 hover:text-success"
              onClick={() => void setMissionStatus(mission.id, 'completed')}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs h-8 text-accent"
              onClick={() => void setMissionStatus(mission.id, 'active')}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Re-open
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEditMission(mission)}
            className="text-xs h-8 text-text-secondary hover:text-text-primary"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleDeleteMission()}
            className={cn(
              'text-xs h-8 text-text-muted hover:text-warning',
              confirmDelete ? 'bg-warning/10 text-warning' : ''
            )}
          >
            <Trash2 size={14} className="mr-1" />
            {confirmDelete ? 'Confirm?' : 'Delete'}
          </Button>

          {confirmDelete && (
            <button 
              className="text-[11px] text-text-muted hover:text-text-primary underline"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {noteEditorState && (
        <Suspense fallback={null}><NoteEditorModal
          mode={noteEditorState.mode}
          note={noteEditorState.note}
          categories={categories}
          missions={missions}
          onClose={() => setNoteEditorState(null)}
          onSubmit={async (draft) => {
            if (noteEditorState.mode === 'create') {
              await createNote({ ...draft, mission_id: mission.id });
            } else if (noteEditorState.note) {
              await updateNote({ ...noteEditorState.note, ...draft });
            }
          }}
        /></Suspense>
      )}
    </div>
  );
}
